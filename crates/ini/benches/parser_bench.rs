use criterion::{black_box, criterion_group, criterion_main, Criterion};
use ini::parser::parse_ini;

fn bench_parser_standard(c: &mut Criterion) {
    let input = r#"[Section]
key = value
; Comment
if variable == 1
    nested = true
endif
"#;
    c.bench_function("parse_standard_ini", |b| {
        b.iter(|| parse_ini(black_box(input)))
    });
}

criterion_group!(benches, bench_parser_standard);
criterion_main!(benches);
