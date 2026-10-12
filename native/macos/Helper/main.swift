// chapcam-vcam-mac - pushes raw BGRA frames from stdin into the sink stream of
// the "ChapCam Camera" Core Media IO extension.
//
//   chapcam-vcam-mac probe              exit 0 when the camera is visible
//   chapcam-vcam-mac stream W H FPS     read W*H*4 byte BGRA frames (top-down)
import CoreMedia
import CoreMediaIO
import CoreVideo
import Foundation

let deviceName = "ChapCam Camera"

func log(_ message: String) {
    FileHandle.standardError.write((message + "\n").data(using: .utf8)!)
}

func address(_ selector: Int) -> CMIOObjectPropertyAddress {
    CMIOObjectPropertyAddress(
        mSelector: CMIOObjectPropertySelector(selector),
        mScope: CMIOObjectPropertyScope(kCMIOObjectPropertyScopeGlobal),
        mElement: CMIOObjectPropertyElement(kCMIOObjectPropertyElementMain)
    )
}

func objectIDs(_ selector: Int, of object: CMIOObjectID) -> [CMIOObjectID] {
    var addr = address(selector)
    var size: UInt32 = 0
    guard CMIOObjectGetPropertyDataSize(object, &addr, 0, nil, &size) == noErr, size > 0 else { return [] }
    var ids = [CMIOObjectID](repeating: 0, count: Int(size) / MemoryLayout<CMIOObjectID>.size)
    var used: UInt32 = 0
    guard CMIOObjectGetPropertyData(object, &addr, 0, nil, size, &used, &ids) == noErr else { return [] }
    return ids
}

func name(of object: CMIOObjectID) -> String? {
    var addr = address(kCMIOObjectPropertyName)
    var value: Unmanaged<CFString>?
    var used: UInt32 = 0
    let size = UInt32(MemoryLayout<Unmanaged<CFString>?>.size)
    let status = withUnsafeMutablePointer(to: &value) {
        CMIOObjectGetPropertyData(object, &addr, 0, nil, size, &used, $0)
    }
    guard status == noErr, let cf = value else { return nil }
    return cf.takeRetainedValue() as String
}

func direction(of stream: CMIOStreamID) -> UInt32? {
    var addr = address(kCMIOStreamPropertyDirection)
    var value: UInt32 = 0
    var used: UInt32 = 0
    let status = CMIOObjectGetPropertyData(stream, &addr, 0, nil, UInt32(MemoryLayout<UInt32>.size), &used, &value)
    return status == noErr ? value : nil
}

func findCamera(timeout: TimeInterval) -> (device: CMIODeviceID, sink: CMIOStreamID)? {
    let deadline = Date().addingTimeInterval(timeout)
    repeat {
        for device in objectIDs(kCMIOHardwarePropertyDevices, of: CMIOObjectID(kCMIOObjectSystemObject))
        where name(of: device) == deviceName {
            let streams = objectIDs(kCMIODevicePropertyStreams, of: device)
            // Direction 1 = input to the device, i.e. the sink stream.
            if let sink = streams.first(where: { direction(of: $0) == 1 }) ?? (streams.count > 1 ? streams[1] : nil) {
                return (device, sink)
            }
        }
        RunLoop.current.run(until: Date().addingTimeInterval(0.25))
    } while Date() < deadline
    return nil
}

func readExact(_ pointer: UnsafeMutableRawPointer, _ count: Int) -> Bool {
    var offset = 0
    while offset < count {
        let n = read(STDIN_FILENO, pointer + offset, count - offset)
        if n <= 0 { return false }
        offset += n
    }
    return true
}

func stream(width: Int, height: Int, fps: Int) -> Int32 {
    guard let camera = findCamera(timeout: 15) else {
        log("ChapCam Camera introuvable. Verifie que l'extension camera est autorisee dans Reglages Systeme.")
        return 3
    }

    var queueRef: Unmanaged<CMSimpleQueue>?
    let queueStatus = CMIOStreamCopyBufferQueue(camera.sink, { _, _, _ in }, nil, &queueRef)
    guard queueStatus == noErr, let queue = queueRef?.takeRetainedValue() else {
        log("CMIOStreamCopyBufferQueue failed: \(queueStatus)")
        return 1
    }
    let startStatus = CMIODeviceStartStream(camera.device, camera.sink)
    guard startStatus == noErr else {
        log("CMIODeviceStartStream failed: \(startStatus)")
        return 1
    }
    defer { CMIODeviceStopStream(camera.device, camera.sink) }

    var pool: CVPixelBufferPool?
    let poolAttributes: NSDictionary = [
        kCVPixelBufferWidthKey: width,
        kCVPixelBufferHeightKey: height,
        kCVPixelBufferPixelFormatTypeKey: kCVPixelFormatType_32BGRA,
        kCVPixelBufferIOSurfacePropertiesKey: [:] as NSDictionary,
    ]
    CVPixelBufferPoolCreate(kCFAllocatorDefault, nil, poolAttributes, &pool)
    guard let pixelPool = pool else {
        log("CVPixelBufferPoolCreate failed")
        return 1
    }

    let rowBytes = width * 4
    var frame = [UInt8](repeating: 0, count: rowBytes * height)
    let frameDuration = CMTime(value: 1, timescale: CMTimeScale(max(1, fps)))
    log("Streaming \(width)x\(height) vers \(deviceName)")

    while frame.withUnsafeMutableBytes({ readExact($0.baseAddress!, $0.count) }) {
        if CMSimpleQueueGetCount(queue) >= CMSimpleQueueGetCapacity(queue) { continue }

        var pixelBuffer: CVPixelBuffer?
        guard CVPixelBufferPoolCreatePixelBuffer(kCFAllocatorDefault, pixelPool, &pixelBuffer) == kCVReturnSuccess,
              let buffer = pixelBuffer else { continue }
        CVPixelBufferLockBaseAddress(buffer, [])
        if let destination = CVPixelBufferGetBaseAddress(buffer) {
            let destinationStride = CVPixelBufferGetBytesPerRow(buffer)
            frame.withUnsafeBytes { source in
                for y in 0..<height {
                    memcpy(destination + y * destinationStride, source.baseAddress! + y * rowBytes, rowBytes)
                }
            }
        }
        CVPixelBufferUnlockBaseAddress(buffer, [])

        var format: CMFormatDescription?
        CMVideoFormatDescriptionCreateForImageBuffer(
            allocator: kCFAllocatorDefault, imageBuffer: buffer, formatDescriptionOut: &format)
        guard let formatDescription = format else { continue }
        var timing = CMSampleTimingInfo(
            duration: frameDuration,
            presentationTimeStamp: CMClockGetTime(CMClockGetHostTimeClock()),
            decodeTimeStamp: .invalid
        )
        var sampleBuffer: CMSampleBuffer?
        guard CMSampleBufferCreateReadyWithImageBuffer(
            allocator: kCFAllocatorDefault, imageBuffer: buffer, formatDescription: formatDescription,
            sampleTiming: &timing, sampleBufferOut: &sampleBuffer) == noErr,
            let sample = sampleBuffer else { continue }
        CMSimpleQueueEnqueue(queue, element: Unmanaged.passRetained(sample).toOpaque())
    }
    return 0
}

let args = CommandLine.arguments
switch args.count > 1 ? args[1] : "" {
case "probe":
    exit(findCamera(timeout: 3) != nil ? 0 : 3)
case "stream" where args.count >= 5:
    exit(stream(width: Int(args[2]) ?? 1280, height: Int(args[3]) ?? 720, fps: Int(args[4]) ?? 30))
default:
    log("usage: chapcam-vcam-mac probe | stream W H FPS")
    exit(1)
}
