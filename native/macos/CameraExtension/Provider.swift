import CoreMediaIO
import CoreVideo
import Foundation
import IOKit.audio
import os

// Read by the app with: log show --predicate 'subsystem == "com.chapcam.desktop.camera-extension"'
let vcamLog = Logger(subsystem: "com.chapcam.desktop.camera-extension", category: "provider")

let kFrameRate = 30
let kWidth: Int32 = 1280
let kHeight: Int32 = 720
let kDeviceName = "ChapCam Camera"
let kStaleAfterNs: UInt64 = 1_500_000_000

private func hostTimeNs(_ time: CMTime) -> UInt64 {
    UInt64(max(0, time.seconds) * Double(NSEC_PER_SEC))
}

// MARK: - Device

final class ChapCamDeviceSource: NSObject, CMIOExtensionDeviceSource {
    private(set) var device: CMIOExtensionDevice!
    private var sourceStream: ChapCamSourceStream!
    private var sinkStream: ChapCamSinkStream!

    private let lock = NSLock()
    private let timerQueue = DispatchQueue(label: "com.chapcam.vcam.timer", qos: .userInteractive)
    private var timer: DispatchSourceTimer?
    private var streamingCounter = 0

    private var latestBuffer: CVPixelBuffer?
    private var latestBufferAt: UInt64 = 0
    private var sinkClient: CMIOExtensionClient?
    private var sinkRunning = false

    private var videoDescription: CMFormatDescription!
    private var placeholderPool: CVPixelBufferPool?
    private var placeholder: CVPixelBuffer?

    init(localizedName: String) {
        super.init()
        device = CMIOExtensionDevice(
            localizedName: localizedName,
            deviceID: UUID(uuidString: "5F2B8E14-9C3A-4D7E-B1A6-2E4C8F0D9A37")!,
            legacyDeviceID: "ChapCamCamera",
            source: self
        )

        CMVideoFormatDescriptionCreate(
            allocator: kCFAllocatorDefault,
            codecType: kCVPixelFormatType_32BGRA,
            width: kWidth,
            height: kHeight,
            extensions: nil,
            formatDescriptionOut: &videoDescription
        )

        let poolAttributes: NSDictionary = [
            kCVPixelBufferWidthKey: kWidth,
            kCVPixelBufferHeightKey: kHeight,
            kCVPixelBufferPixelFormatTypeKey: kCVPixelFormatType_32BGRA,
            kCVPixelBufferIOSurfacePropertiesKey: [:] as NSDictionary,
        ]
        CVPixelBufferPoolCreate(kCFAllocatorDefault, nil, poolAttributes, &placeholderPool)

        let frameDuration = CMTime(value: 1, timescale: Int32(kFrameRate))
        let format = CMIOExtensionStreamFormat(
            formatDescription: videoDescription,
            maxFrameDuration: frameDuration,
            minFrameDuration: frameDuration,
            validFrameDurations: nil
        )

        sourceStream = ChapCamSourceStream(
            localizedName: "ChapCam Camera",
            streamID: UUID(uuidString: "A1C4E7F2-3B6D-4E8A-9F01-2C5B7D9E1A34")!,
            streamFormat: format,
            device: self
        )
        sinkStream = ChapCamSinkStream(
            localizedName: "ChapCam Camera Input",
            streamID: UUID(uuidString: "B2D5F8A3-4C7E-4F9B-A012-3D6C8E0F2B45")!,
            streamFormat: format,
            device: self
        )

        do {
            try device.addStream(sourceStream.stream)
            try device.addStream(sinkStream.stream)
            vcamLog.notice("Streams added (source + sink)")
        } catch {
            vcamLog.fault("Failed to add streams: \(error.localizedDescription, privacy: .public)")
            fatalError("ChapCam Camera: failed to add streams: \(error.localizedDescription)")
        }
    }

    var availableProperties: Set<CMIOExtensionProperty> { [.deviceTransportType, .deviceModel] }

    func deviceProperties(forProperties properties: Set<CMIOExtensionProperty>) throws -> CMIOExtensionDeviceProperties {
        let deviceProperties = CMIOExtensionDeviceProperties(dictionary: [:])
        if properties.contains(.deviceTransportType) {
            deviceProperties.transportType = kIOAudioDeviceTransportTypeVirtual
        }
        if properties.contains(.deviceModel) {
            deviceProperties.model = kDeviceName
        }
        return deviceProperties
    }

    func setDeviceProperties(_ deviceProperties: CMIOExtensionDeviceProperties) throws {}

    // MARK: Source stream (what Zoom, Teams, Meet... read)

    func startStreaming() {
        lock.lock()
        streamingCounter += 1
        let needsTimer = timer == nil
        lock.unlock()
        if needsTimer { startTimer() }
    }

    func stopStreaming() {
        lock.lock()
        if streamingCounter > 1 {
            streamingCounter -= 1
        } else {
            streamingCounter = 0
            timer?.cancel()
            timer = nil
        }
        lock.unlock()
    }

    private func startTimer() {
        let newTimer = DispatchSource.makeTimerSource(flags: .strict, queue: timerQueue)
        newTimer.schedule(deadline: .now(), repeating: 1.0 / Double(kFrameRate), leeway: .milliseconds(2))
        newTimer.setEventHandler { [weak self] in self?.emitFrame() }
        lock.lock()
        timer = newTimer
        lock.unlock()
        newTimer.resume()
    }

    private func emitFrame() {
        let now = CMClockGetTime(CMClockGetHostTimeClock())
        let nowNs = hostTimeNs(now)

        lock.lock()
        var pixelBuffer = latestBuffer
        let fresh = pixelBuffer != nil && nowNs &- latestBufferAt < kStaleAfterNs
        lock.unlock()
        if !fresh { pixelBuffer = blackFrame() }
        guard let buffer = pixelBuffer else { return }

        var format: CMFormatDescription?
        CMVideoFormatDescriptionCreateForImageBuffer(
            allocator: kCFAllocatorDefault, imageBuffer: buffer, formatDescriptionOut: &format)
        guard let formatDescription = format else { return }

        var timing = CMSampleTimingInfo(
            duration: CMTime(value: 1, timescale: Int32(kFrameRate)),
            presentationTimeStamp: now,
            decodeTimeStamp: .invalid
        )
        var sampleBuffer: CMSampleBuffer?
        let status = CMSampleBufferCreateReadyWithImageBuffer(
            allocator: kCFAllocatorDefault,
            imageBuffer: buffer,
            formatDescription: formatDescription,
            sampleTiming: &timing,
            sampleBufferOut: &sampleBuffer
        )
        guard status == noErr, let sample = sampleBuffer else { return }
        sourceStream.stream.send(sample, discontinuity: [], hostTimeInNanoseconds: nowNs)
    }

    private func blackFrame() -> CVPixelBuffer? {
        if let placeholder = placeholder { return placeholder }
        guard let pool = placeholderPool else { return nil }
        var buffer: CVPixelBuffer?
        guard CVPixelBufferPoolCreatePixelBuffer(kCFAllocatorDefault, pool, &buffer) == kCVReturnSuccess,
              let pixelBuffer = buffer else { return nil }
        CVPixelBufferLockBaseAddress(pixelBuffer, [])
        if let base = CVPixelBufferGetBaseAddress(pixelBuffer) {
            let bytes = CVPixelBufferGetBytesPerRow(pixelBuffer) * CVPixelBufferGetHeight(pixelBuffer)
            let pixels = base.bindMemory(to: UInt32.self, capacity: bytes / 4)
            for i in 0..<(bytes / 4) { pixels[i] = 0xFF10_1010 }
        }
        CVPixelBufferUnlockBaseAddress(pixelBuffer, [])
        placeholder = pixelBuffer
        return pixelBuffer
    }

    // MARK: Sink stream (frames pushed by chapcam-vcam-mac)

    func sinkAuthorized(_ client: CMIOExtensionClient) {
        lock.lock()
        sinkClient = client
        lock.unlock()
    }

    func startSink() {
        lock.lock()
        let client = sinkClient
        sinkRunning = client != nil
        lock.unlock()
        if let client = client { consume(from: client) }
    }

    func stopSink() {
        lock.lock()
        sinkRunning = false
        lock.unlock()
    }

    private func consume(from client: CMIOExtensionClient) {
        sinkStream.stream.consumeSampleBuffer(from: client) { [weak self] sampleBuffer, sequenceNumber, _, _, _ in
            guard let self = self else { return }
            if let sampleBuffer = sampleBuffer, let imageBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) {
                let nowNs = hostTimeNs(CMClockGetTime(CMClockGetHostTimeClock()))
                self.lock.lock()
                self.latestBuffer = imageBuffer
                self.latestBufferAt = nowNs
                self.lock.unlock()
                self.sinkStream.stream.notifyScheduledOutputChanged(
                    CMIOExtensionScheduledOutput(sequenceNumber: sequenceNumber, hostTimeInNanoseconds: nowNs))
            }

            self.lock.lock()
            let running = self.sinkRunning
            self.lock.unlock()
            guard running else { return }
            if sampleBuffer == nil {
                self.timerQueue.asyncAfter(deadline: .now() + .milliseconds(5)) { self.consume(from: client) }
            } else {
                self.consume(from: client)
            }
        }
    }
}

// MARK: - Streams

final class ChapCamSourceStream: NSObject, CMIOExtensionStreamSource {
    private(set) var stream: CMIOExtensionStream!
    private let streamFormat: CMIOExtensionStreamFormat
    private weak var device: ChapCamDeviceSource?

    init(localizedName: String, streamID: UUID, streamFormat: CMIOExtensionStreamFormat, device: ChapCamDeviceSource) {
        self.streamFormat = streamFormat
        self.device = device
        super.init()
        stream = CMIOExtensionStream(
            localizedName: localizedName, streamID: streamID, direction: .source, clockType: .hostTime, source: self)
    }

    var formats: [CMIOExtensionStreamFormat] { [streamFormat] }
    var activeFormatIndex: Int = 0

    var availableProperties: Set<CMIOExtensionProperty> { [.streamActiveFormatIndex, .streamFrameDuration] }

    func streamProperties(forProperties properties: Set<CMIOExtensionProperty>) throws -> CMIOExtensionStreamProperties {
        let streamProperties = CMIOExtensionStreamProperties(dictionary: [:])
        if properties.contains(.streamActiveFormatIndex) { streamProperties.activeFormatIndex = 0 }
        if properties.contains(.streamFrameDuration) {
            streamProperties.frameDuration = CMTime(value: 1, timescale: Int32(kFrameRate))
        }
        return streamProperties
    }

    func setStreamProperties(_ streamProperties: CMIOExtensionStreamProperties) throws {
        if let index = streamProperties.activeFormatIndex { activeFormatIndex = index }
    }

    func authorizedToStartStream(for client: CMIOExtensionClient) -> Bool { true }
    func startStream() throws { device?.startStreaming() }
    func stopStream() throws { device?.stopStreaming() }
}

final class ChapCamSinkStream: NSObject, CMIOExtensionStreamSource {
    private(set) var stream: CMIOExtensionStream!
    private let streamFormat: CMIOExtensionStreamFormat
    private weak var device: ChapCamDeviceSource?

    init(localizedName: String, streamID: UUID, streamFormat: CMIOExtensionStreamFormat, device: ChapCamDeviceSource) {
        self.streamFormat = streamFormat
        self.device = device
        super.init()
        stream = CMIOExtensionStream(
            localizedName: localizedName, streamID: streamID, direction: .sink, clockType: .hostTime, source: self)
    }

    var formats: [CMIOExtensionStreamFormat] { [streamFormat] }
    var activeFormatIndex: Int = 0

    var availableProperties: Set<CMIOExtensionProperty> {
        [
            .streamActiveFormatIndex, .streamFrameDuration, .streamSinkBufferQueueSize,
            .streamSinkBuffersRequiredForStartup, .streamSinkBufferUnderrunCount, .streamSinkEndOfData,
        ]
    }

    func streamProperties(forProperties properties: Set<CMIOExtensionProperty>) throws -> CMIOExtensionStreamProperties {
        let streamProperties = CMIOExtensionStreamProperties(dictionary: [:])
        if properties.contains(.streamActiveFormatIndex) { streamProperties.activeFormatIndex = 0 }
        if properties.contains(.streamFrameDuration) {
            streamProperties.frameDuration = CMTime(value: 1, timescale: Int32(kFrameRate))
        }
        if properties.contains(.streamSinkBufferQueueSize) { streamProperties.sinkBufferQueueSize = 1 }
        if properties.contains(.streamSinkBuffersRequiredForStartup) {
            streamProperties.sinkBuffersRequiredForStartup = 1
        }
        return streamProperties
    }

    func setStreamProperties(_ streamProperties: CMIOExtensionStreamProperties) throws {
        if let index = streamProperties.activeFormatIndex { activeFormatIndex = index }
    }

    func authorizedToStartStream(for client: CMIOExtensionClient) -> Bool {
        device?.sinkAuthorized(client)
        return true
    }
    func startStream() throws { device?.startSink() }
    func stopStream() throws { device?.stopSink() }
}

// MARK: - Provider

final class ChapCamProviderSource: NSObject, CMIOExtensionProviderSource {
    private(set) var provider: CMIOExtensionProvider!
    private var deviceSource: ChapCamDeviceSource!

    init(clientQueue: DispatchQueue?) {
        super.init()
        provider = CMIOExtensionProvider(source: self, clientQueue: clientQueue)
        deviceSource = ChapCamDeviceSource(localizedName: kDeviceName)
        do {
            try provider.addDevice(deviceSource.device)
            vcamLog.notice("Device published: \(kDeviceName, privacy: .public)")
        } catch {
            vcamLog.fault("Failed to add device: \(error.localizedDescription, privacy: .public)")
            fatalError("ChapCam Camera: failed to add device: \(error.localizedDescription)")
        }
    }

    func connect(to client: CMIOExtensionClient) throws {
        vcamLog.info("Client connected: pid \(client.pid, privacy: .public)")
    }
    func disconnect(from client: CMIOExtensionClient) {
        vcamLog.info("Client disconnected: pid \(client.pid, privacy: .public)")
    }

    var availableProperties: Set<CMIOExtensionProperty> { [.providerManufacturer] }

    func providerProperties(forProperties properties: Set<CMIOExtensionProperty>) throws -> CMIOExtensionProviderProperties {
        let providerProperties = CMIOExtensionProviderProperties(dictionary: [:])
        if properties.contains(.providerManufacturer) { providerProperties.manufacturer = "ChapCam" }
        return providerProperties
    }

    func setProviderProperties(_ providerProperties: CMIOExtensionProviderProperties) throws {}
}
