{
  "targets": [
    {
      "target_name": "vcam_activator",
      "sources": ["activator.mm"],
      "xcode_settings": {
        "CLANG_ENABLE_OBJC_ARC": "YES",
        "CLANG_CXX_LANGUAGE_STANDARD": "c++17",
        "MACOSX_DEPLOYMENT_TARGET": "12.3"
      },
      "link_settings": {
        "libraries": ["-framework Foundation", "-framework SystemExtensions"]
      }
    }
  ]
}
