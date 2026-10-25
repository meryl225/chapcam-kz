import CoreGraphics
import CoreMediaIO
import CoreText
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

// The waiting image keeps this exact BGRA color in its corners so
// `chapcam-vcam-mac verify` can tell it apart from real ChapCam frames.
let kPlaceholderBGRA: (b: UInt8, g: UInt8, r: UInt8) = (0x3D, 0x1A, 0x12)

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
    private var bufferPool: CVPixelBufferPool?
    private var placeholder: CVPixelBuffer?
    private var receivedFrames: UInt64 = 0
    private var rejectedFrames: UInt64 = 0

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
        let poolOptions: NSDictionary = [kCVPixelBufferPoolMinimumBufferCountKey: 6]
        CVPixelBufferPoolCreate(kCFAllocatorDefault, poolOptions, poolAttributes, &bufferPool)

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
        if !fresh { pixelBuffer = waitingFrame() }
        guard let buffer = pixelBuffer else { return }

        // Every buffer comes from our own pool, so it always matches the
        // advertised format; clients such as Telegram drop mismatched samples.
        var timing = CMSampleTimingInfo(
            duration: CMTime(value: 1, timescale: Int32(kFrameRate)),
            presentationTimeStamp: now,
            decodeTimeStamp: .invalid
        )
        var sampleBuffer: CMSampleBuffer?
        let status = CMSampleBufferCreateReadyWithImageBuffer(
            allocator: kCFAllocatorDefault,
            imageBuffer: buffer,
            formatDescription: videoDescription,
            sampleTiming: &timing,
            sampleBufferOut: &sampleBuffer
        )
        guard status == noErr, let sample = sampleBuffer else {
            vcamLog.error("CMSampleBufferCreateReadyWithImageBuffer failed: \(status, privacy: .public)")
            return
        }
        sourceStream.stream.send(sample, discontinuity: [], hostTimeInNanoseconds: nowNs)
    }

    private func makePoolBuffer() -> CVPixelBuffer? {
        guard let pool = bufferPool else { return nil }
        var buffer: CVPixelBuffer?
        guard CVPixelBufferPoolCreatePixelBuffer(kCFAllocatorDefault, pool, &buffer) == kCVReturnSuccess else {
            return nil
        }
        return buffer
    }

    // Copies a frame pushed by the helper into a buffer owned by the extension.
    private func copyIntoPool(_ source: CVPixelBuffer) -> CVPixelBuffer? {
        guard CVPixelBufferGetPixelFormatType(source) == kCVPixelFormatType_32BGRA,
              CVPixelBufferGetWidth(source) == Int(kWidth),
              CVPixelBufferGetHeight(source) == Int(kHeight),
              let destination = makePoolBuffer() else { return nil }

        CVPixelBufferLockBaseAddress(source, .readOnly)
        CVPixelBufferLockBaseAddress(destination, [])
        defer {
            CVPixelBufferUnlockBaseAddress(destination, [])
            CVPixelBufferUnlockBaseAddress(source, .readOnly)
        }
        guard let from = CVPixelBufferGetBaseAddress(source),
              let to = CVPixelBufferGetBaseAddress(destination) else { return nil }
        let fromStride = CVPixelBufferGetBytesPerRow(source)
        let toStride = CVPixelBufferGetBytesPerRow(destination)
        let rowBytes = Int(kWidth) * 4
        if fromStride == toStride {
            memcpy(to, from, toStride * Int(kHeight))
        } else {
            for y in 0..<Int(kHeight) { memcpy(to + y * toStride, from + y * fromStride, rowBytes) }
        }
        return destination
    }

    // Shown while no ChapCam frame arrives, so a video app displays an
    // explicit status instead of a black image.
    private func waitingFrame() -> CVPixelBuffer? {
        if let placeholder = placeholder { return placeholder }
        guard let pixelBuffer = makePoolBuffer() else { return nil }
        CVPixelBufferLockBaseAddress(pixelBuffer, [])
        defer { CVPixelBufferUnlockBaseAddress(pixelBuffer, []) }
        guard let base = CVPixelBufferGetBaseAddress(pixelBuffer) else { return nil }
        let width = Int(kWidth)
        let height = Int(kHeight)
        let stride = CVPixelBufferGetBytesPerRow(pixelBuffer)

        let colorSpace = CGColorSpaceCreateDeviceRGB()
        let bitmapInfo = CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue
        if let context = CGContext(
            data: base, width: width, height: height, bitsPerComponent: 8, bytesPerRow: stride,
            space: colorSpace, bitmapInfo: bitmapInfo)
        {
            context.setFillColor(
                red: CGFloat(kPlaceholderBGRA.r) / 255, green: CGFloat(kPlaceholderBGRA.g) / 255,
                blue: CGFloat(kPlaceholderBGRA.b) / 255, alpha: 1)
            context.fill(CGRect(x: 0, y: 0, width: width, height: height))

            let lines: [(String, CGFloat, CGFloat)] = [
                ("ChapCam Camera", 64, 1.0),
                ("En attente du flux ChapCam", 36, 0.85),
                ("Ouvre ChapCam et lance le Live Swap", 26, 0.6),
            ]
            var y = CGFloat(height) / 2 + 70
            for (text, size, alpha) in lines {
                let font = CTFontCreateUIFontForLanguage(.system, size, nil)
                    ?? CTFontCreateWithName("Helvetica" as CFString, size, nil)
                let attributes: [NSAttributedString.Key: Any] = [
                    NSAttributedString.Key(kCTFontAttributeName as String): font,
                    NSAttributedString.Key(kCTForegroundColorAttributeName as String):
                        CGColor(red: 1, green: 1, blue: 1, alpha: alpha),
                ]
                let line = CTLineCreateWithAttributedString(NSAttributedString(string: text, attributes: attributes))
                let lineWidth = CTLineGetTypographicBounds(line, nil, nil, nil)
                context.textPosition = CGPoint(x: (CGFloat(width) - CGFloat(lineWidth)) / 2, y: y)
                CTLineDraw(line, context)
                y -= size + 30
            }
        }

        // Pin the sentinel color in all four corners (2x2 px).
        for (cx, cy) in [(0, 0), (width - 2, 0), (0, height - 2), (width - 2, height - 2)] {
            for dy in 0..<2 {
                let row = base.advanced(by: (cy + dy) * stride).assumingMemoryBound(to: UInt8.self)
                for dx in 0..<2 {
                    let p = row.advanced(by: (cx + dx) * 4)
                    p[0] = kPlaceholderBGRA.b
                    p[1] = kPlaceholderBGRA.g
                    p[2] = kPlaceholderBGRA.r
                    p[3] = 0xFF
                }
            }
        }
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
                let copy = self.copyIntoPool(imageBuffer)
                self.lock.lock()
                if let copy = copy {
                    self.latestBuffer = copy
                    self.latestBufferAt = nowNs
                    self.receivedFrames &+= 1
                } else {
                    self.rejectedFrames &+= 1
                }
                let received = self.receivedFrames
                let rejected = self.rejectedFrames
                self.lock.unlock()
                if received == 1 { vcamLog.notice("First ChapCam frame received from helper") }
                if copy == nil && (rejected == 1 || rejected % 300 == 0) {
                    vcamLog.error(
                        "Rejected frame \(CVPixelBufferGetWidth(imageBuffer), privacy: .public)x\(CVPixelBufferGetHeight(imageBuffer), privacy: .public) (expected 1280x720 BGRA), total \(rejected, privacy: .public)")
                }
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
