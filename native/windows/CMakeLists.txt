cmake_minimum_required(VERSION 3.20)
project(ChapCamVirtualCamera LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Static CRT: the source DLL is loaded by the Frame Server service, which must
# not depend on a Visual C++ redistributable being installed.
set(CMAKE_MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>")

add_compile_definitions(
  UNICODE _UNICODE NOMINMAX
  _WIN32_WINNT=0x0A00 WINVER=0x0A00 NTDDI_VERSION=0x0A00000B
)
add_compile_options(/W3 /EHsc /permissive-)

add_library(ChapCamVCamSource SHARED source/source.cpp source/source.def)
target_include_directories(ChapCamVCamSource PRIVATE common)
target_link_libraries(ChapCamVCamSource PRIVATE mfplat ole32 shell32 advapi32 runtimeobject)

add_executable(chapcam-vcam helper/main.cpp)
target_include_directories(chapcam-vcam PRIVATE common)
target_link_libraries(chapcam-vcam PRIVATE mfplat ole32 shell32 advapi32)
