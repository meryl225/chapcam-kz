"""
File d'attente au niveau du worker GPU.

Le GPU ne peut traiter qu'un nombre limite de sessions simultanees sans
exploser la latence (selon la VRAM). Au-dela, les nouveaux arrivants attendent
dans une file et recoivent leur position en temps reel.

Politique : priorite aux sessions payantes (paid/ready) ; les essais gratuits
(trial) passent derriere. A egalite de priorite, premier arrive premier servi.
"""

from __future__ import annotations

import asyncio
import itertools
import os
from dataclasses import dataclass, field
from typing import Optional


# Priorite : plus le chiffre est petit, plus on passe tot.
_PRIORITY = {"paid": 0, "ready": 0, "trial": 1, "none": 2}


class QueueFull(Exception):
    """File d'attente saturee : on refuse l'entree plutot que de faire attendre
    indefiniment (le worker reste sain et continue de servir les sessions actives)."""


@dataclass(order=True)
class _Waiter:
    sort_key: tuple = field(init=False)
    priority: int
    seq: int
    user_id: str = field(compare=False)
    event: asyncio.Event = field(compare=False)
    cancelled: bool = field(default=False, compare=False)

    def __post_init__(self):
        self.sort_key = (self.priority, self.seq)


class GpuQueue:
    def __init__(self, max_concurrent: Optional[int] = None, max_queue: Optional[int] = None):
        self.max_concurrent = max_concurrent or int(os.getenv("CHAPCAM_MAX_CONCURRENT", "2"))
        # Taille max de la file d'attente avant rejet (0 = illimite).
        self.max_queue = max_queue if max_queue is not None else int(os.getenv("CHAPCAM_MAX_QUEUE", "20"))
        self._active = 0
        self._waiters: list[_Waiter] = []
        self._seq = itertools.count()
        self._cond = asyncio.Lock()

    @property
    def active(self) -> int:
        return self._active

    @property
    def waiting(self) -> int:
        return len([w for w in self._waiters if not w.cancelled])

    def _position_of(self, waiter: _Waiter) -> int:
        """Position (1-based) du waiter dans la file triee."""
        ordered = sorted([w for w in self._waiters if not w.cancelled])
        for i, w in enumerate(ordered):
            if w is waiter:
                return i + 1
        return 0

    async def acquire(self, user_id: str, mode: str, on_position) -> "QueueTicket":
        """
        Tente d'obtenir un slot GPU.
        - Si un slot est libre : renvoie immediatement un ticket actif.
        - Sinon : place dans la file, appelle on_position(position, total) a chaque
          changement, et attend qu'un slot se libere.
        """
        async with self._cond:
            if self._active < self.max_concurrent and not self._waiters:
                self._active += 1
                return QueueTicket(self, user_id)

            # File saturee : on refuse plutot que de faire patienter sans fin.
            active_waiters = len([w for w in self._waiters if not w.cancelled])
            if self.max_queue > 0 and active_waiters >= self.max_queue:
                raise QueueFull()

            waiter = _Waiter(priority=_PRIORITY.get(mode, 2), seq=next(self._seq), user_id=user_id, event=asyncio.Event())
            self._waiters.append(waiter)
            await self._broadcast_positions()

        # Notifier sa position initiale
        pos = self._position_of(waiter)
        await on_position(pos, self.waiting)

        # Attendre son tour ; re-notifier a chaque reveil
        while True:
            await waiter.event.wait()
            waiter.event.clear()
            async with self._cond:
                if waiter.cancelled:
                    raise asyncio.CancelledError()
                # Est-ce notre tour ?
                ordered = sorted([w for w in self._waiters if not w.cancelled])
                if ordered and ordered[0] is waiter and self._active < self.max_concurrent:
                    self._waiters.remove(waiter)
                    self._active += 1
                    await self._broadcast_positions()
                    return QueueTicket(self, user_id)
            pos = self._position_of(waiter)
            if pos > 0:
                await on_position(pos, self.waiting)

    async def _broadcast_positions(self) -> None:
        # Reveille tous les waiters pour qu'ils recalculent leur position.
        for w in self._waiters:
            if not w.cancelled:
                w.event.set()

    async def release(self) -> None:
        async with self._cond:
            self._active = max(0, self._active - 1)
            await self._broadcast_positions()

    async def cancel(self, ticket_user_id: str) -> None:
        async with self._cond:
            for w in self._waiters:
                if w.user_id == ticket_user_id and not w.cancelled:
                    w.cancelled = True
                    w.event.set()
            await self._broadcast_positions()


@dataclass
class QueueTicket:
    queue: GpuQueue
    user_id: str
    _released: bool = field(default=False)

    async def release(self):
        if not self._released:
            self._released = True
            await self.queue.release()
