'use client'

export default function PlansPage() {
  return (
    <div className="min-h-screen bg-[#050505] py-12 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
            Changez d’apparence en live
          </h1>
          <p className="text-3xl text-emerald-400 font-medium">avec ChapCam</p>
          <p className="text-gray-400 mt-6 text-lg">
            2 points = 1 seconde de transformation du visage et corps entier
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">

          {/* Starter - 1 Jour */}
          <div className="bg-[#111] border border-gray-800 rounded-3xl p-8 hover:border-[#00ff88]/70 transition-all group">
            <div className="text-emerald-400 text-sm font-medium mb-2">1 JOUR</div>
            <h3 className="text-2xl font-bold text-white">Starter</h3>
            
            <div className="mt-8">
              <span className="text-5xl font-bold text-white">10.000</span>
              <span className="text-gray-400"> FCFA</span>
            </div>
            
            <ul className="mt-10 space-y-4 text-gray-300">
              <li>• Transformation du visage et corps entier</li>
              <li>• 500 points (4 min 10 sec)</li>
              <li>• Qualité HD</li>
            </ul>
            
            <button className="mt-12 w-full py-4 bg-white text-black font-semibold rounded-2xl hover:bg-gray-200 transition-all">
              Choisir ce plan
            </button>
          </div>

          {/* Popular - 30 Jours */}
          <div className="bg-[#111] border-2 border-[#00ff88] rounded-3xl p-8 relative scale-105 shadow-2xl">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#00ff88] text-black text-sm font-bold px-6 py-1 rounded-full">
              MEILLEUR CHOIX
            </div>
            
            <div className="text-emerald-400 text-sm font-medium mb-2">30 JOURS</div>
            <h3 className="text-2xl font-bold text-white">Popular</h3>
            
            <div className="mt-8">
              <span className="text-5xl font-bold text-white">90.000</span>
              <span className="text-gray-400"> FCFA</span>
            </div>
            
            <ul className="mt-10 space-y-4 text-gray-300">
              <li>• Transformation du visage et corps entier</li>
              <li>• 6 000 points (50 minutes)</li>
              <li>• Qualité HD 1080p</li>
              <li className="text-emerald-400">• Support prioritaire</li>
            </ul>
            
            <button className="mt-12 w-full py-4 bg-[#00ff88] text-black font-bold rounded-2xl hover:bg-[#00dd77] transition-all">
              Choisir ce plan
            </button>
          </div>

          {/* Pro - 90 Jours */}
          <div className="bg-[#111] border border-gray-800 rounded-3xl p-8 hover:border-[#00ff88]/70 transition-all group">
            <div className="text-emerald-400 text-sm font-medium mb-2">90 JOURS</div>
            <h3 className="text-2xl font-bold text-white">Pro</h3>
            
            <div className="mt-8">
              <span className="text-5xl font-bold text-white">220.000</span>
              <span className="text-gray-400"> FCFA</span>
            </div>
            
            <ul className="mt-10 space-y-4 text-gray-300">
              <li>• Transformation du visage et corps entier</li>
              <li>• 16 000 points (133 minutes)</li>
              <li>• Qualité 4K Ultra HD</li>
              <li>• Support prioritaire</li>
            </ul>
            
            <button className="mt-12 w-full py-4 bg-white text-black font-semibold rounded-2xl hover:bg-gray-200 transition-all">
              Choisir ce plan
            </button>
          </div>

          {/* Ultimate - 365 Jours */}
          <div className="bg-[#111] border border-gray-800 rounded-3xl p-8 hover:border-[#00ff88]/70 transition-all group">
            <div className="text-emerald-400 text-sm font-medium mb-2">365 JOURS</div>
            <h3 className="text-2xl font-bold text-white">Ultimate</h3>
            
            <div className="mt-8">
              <span className="text-5xl font-bold text-white">550.000</span>
              <span className="text-gray-400"> FCFA</span>
            </div>
            
            <ul className="mt-10 space-y-4 text-gray-300">
              <li>• Transformation du visage et corps entier</li>
              <li>• 45 000 points (375 minutes)</li>
              <li>• Qualité 4K Ultra HD</li>
              <li>• Support VIP 24/7</li>
              <li className="text-emerald-400">• Accès aux nouveautés</li>
            </ul>
            
            <button className="mt-12 w-full py-4 bg-white text-black font-semibold rounded-2xl hover:bg-gray-200 transition-all">
              Choisir ce plan
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
