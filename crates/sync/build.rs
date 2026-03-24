fn main() {
    // Compile hpatchz
    let mut build = cc::Build::new();
    build
        .file("vendor/hpatchz/patch.c")
        .include("vendor/hpatchz")
        .define("_IS_USED_MULTITHREAD", "0") // Disable MT for safety/simplicity
        .warnings(false); // Vendor code might have warnings

    build.compile("hpatchz");

    // Proto build
    prost_build::compile_protos(&["src/proto/sophon.proto"], &["src/proto"]).unwrap();
}
