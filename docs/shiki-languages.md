# Shiki 支持语言

本文件由 `node scripts/generate-shiki-languages.mjs` 从 Shiki 4.4.3 的真实注册表生成，共 **242 种语言、104 个官方别名**。

代码围栏推荐使用「标识」列的小写名称。主题另外兼容 `c++` → `cpp`、`c#` → `csharp`、`htm` → `html`、`shell` → `shellscript`、`vue-html` → `vue`。

注意：`mermaid`、`math`、`echarts`、`mindmap`、`markmap`、`abc`、`graphviz`、`flowchart`、`plantuml` 保留给图表/公式渲染；需要展示原始图表代码时使用 `text`。参见 [Vditor 书写说明](vditor-writing.md)。

| 语言 | 标识 | 官方别名 |
| --- | --- | --- |
| ABAP | `abap` | — |
| ActionScript | `actionscript-3` | `actionscript`、`as3` |
| Ada | `ada` | — |
| AutoHotkey | `ahk` | `ahk1` |
| AutoHotkey2 | `ahk2` | — |
| Angular HTML | `angular-html` | — |
| Angular TypeScript | `angular-ts` | — |
| Apache Conf | `apache` | — |
| Apex | `apex` | — |
| APL | `apl` | — |
| AppleScript | `applescript` | — |
| Ara | `ara` | — |
| AsciiDoc | `asciidoc` | `adoc` |
| Assembly | `asm` | — |
| Astro | `astro` | — |
| AWK | `awk` | — |
| Ballerina | `ballerina` | — |
| Batch File | `bat` | `batch`、`cmd` |
| Beancount | `beancount` | — |
| Berry | `berry` | `be` |
| BibTeX | `bibtex` | — |
| Bicep | `bicep` | — |
| BIRD2 Configuration | `bird2` | `bird` |
| Blade | `blade` | — |
| 1C (Enterprise) | `bsl` | `1c` |
| C | `c` | — |
| C3 | `c3` | — |
| Cadence | `cadence` | `cdc` |
| Cairo | `cairo` | — |
| Chapel | `chapel` | `chpl` |
| Clarity | `clarity` | — |
| Clojure | `clojure` | `clj` |
| CMake | `cmake` | — |
| COBOL | `cobol` | — |
| CODEOWNERS | `codeowners` | — |
| CodeQL | `codeql` | `ql` |
| CoffeeScript | `coffee` | `coffeescript` |
| Common Lisp | `common-lisp` | `lisp` |
| Rocq | `coq` | — |
| C++ | `cpp` | `c++` |
| Crystal | `crystal` | — |
| C# | `csharp` | `c#`、`cs` |
| CSS | `css` | — |
| CSV | `csv` | — |
| CUE | `cue` | — |
| Cypher | `cypher` | `cql` |
| D | `d` | — |
| Dart | `dart` | — |
| DAX | `dax` | — |
| Desktop | `desktop` | — |
| Diff | `diff` | — |
| Dockerfile | `docker` | `dockerfile` |
| dotEnv | `dotenv` | — |
| Dream Maker | `dream-maker` | — |
| Edge | `edge` | — |
| Elixir | `elixir` | — |
| Elm | `elm` | — |
| Emacs Lisp | `emacs-lisp` | `elisp` |
| ERB | `erb` | — |
| Erlang | `erlang` | `erl` |
| Fennel | `fennel` | — |
| Fish | `fish` | — |
| Fluent | `fluent` | `ftl` |
| Fortran (Fixed Form) | `fortran-fixed-form` | `f`、`for`、`f77` |
| Fortran (Free Form) | `fortran-free-form` | `f90`、`f95`、`f03`、`f08`、`f18` |
| F# | `fsharp` | `f#`、`fs` |
| GDResource | `gdresource` | `tscn`、`tres` |
| GDScript | `gdscript` | `gd` |
| GDShader | `gdshader` | — |
| Genie | `genie` | — |
| Gherkin | `gherkin` | — |
| Git Commit Message | `git-commit` | — |
| Git Rebase Message | `git-rebase` | — |
| Gleam | `gleam` | — |
| Glimmer JS | `glimmer-js` | `gjs` |
| Glimmer TS | `glimmer-ts` | `gts` |
| GLSL | `glsl` | — |
| GN | `gn` | — |
| Gnuplot | `gnuplot` | — |
| Go | `go` | — |
| GraphQL | `graphql` | `gql` |
| Groovy | `groovy` | — |
| Hack | `hack` | — |
| Ruby Haml | `haml` | — |
| Handlebars | `handlebars` | `hbs` |
| Haskell | `haskell` | `hs` |
| Haxe | `haxe` | — |
| HashiCorp HCL | `hcl` | — |
| Hjson | `hjson` | — |
| HLSL | `hlsl` | — |
| HTML | `html` | — |
| HTML (Derivative) | `html-derivative` | — |
| HTTP | `http` | — |
| Hurl | `hurl` | — |
| HXML | `hxml` | — |
| Hy | `hy` | — |
| Imba | `imba` | — |
| INI | `ini` | `properties` |
| Java | `java` | — |
| JavaScript | `javascript` | `js`、`cjs`、`mjs` |
| Jinja | `jinja` | — |
| Jison | `jison` | — |
| JSON | `json` | — |
| JSON5 | `json5` | — |
| JSON with Comments | `jsonc` | — |
| JSON Lines | `jsonl` | — |
| Jsonnet | `jsonnet` | — |
| JSSM | `jssm` | `fsl` |
| JSX | `jsx` | — |
| Julia | `julia` | `jl` |
| Just | `just` | `justfile` |
| KDL | `kdl` | — |
| Kotlin | `kotlin` | `kt`、`kts` |
| Kusto | `kusto` | `kql` |
| LaTeX | `latex` | — |
| Lean 4 | `lean` | `lean4` |
| Less | `less` | — |
| Liquid | `liquid` | — |
| LLVM IR | `llvm` | — |
| Log file | `log` | — |
| Logo | `logo` | — |
| Lua | `lua` | — |
| Luau | `luau` | — |
| Makefile | `make` | `makefile` |
| Markdown | `markdown` | `md` |
| Marko | `marko` | — |
| MATLAB | `matlab` | — |
| MDC | `mdc` | — |
| MDX | `mdx` | — |
| Mermaid | `mermaid` | `mmd` |
| MIPS Assembly | `mipsasm` | `mips` |
| Mojo | `mojo` | — |
| MoonBit | `moonbit` | `mbt`、`mbti` |
| Move | `move` | — |
| Narrat Language | `narrat` | `nar` |
| Nextflow | `nextflow` | `nf` |
| Nextflow Groovy | `nextflow-groovy` | — |
| Nginx | `nginx` | — |
| Nim | `nim` | — |
| Nix | `nix` | — |
| NSIS | `nsis` | — |
| nushell | `nushell` | `nu` |
| Objective-C | `objective-c` | `objc` |
| Objective-C++ | `objective-cpp` | — |
| OCaml | `ocaml` | — |
| Odin | `odin` | — |
| OpenSCAD | `openscad` | `scad` |
| Org Markup | `org` | — |
| Pascal | `pascal` | — |
| Perl | `perl` | — |
| PHP | `php` | — |
| Pkl | `pkl` | — |
| PL/SQL | `plsql` | — |
| Gettext PO | `po` | `pot`、`potx` |
| Polar | `polar` | — |
| PostCSS | `postcss` | — |
| PowerQuery | `powerquery` | — |
| PowerShell | `powershell` | `ps`、`ps1`、`pwsh` |
| Prisma | `prisma` | — |
| Prolog | `prolog` | — |
| Protocol Buffer 3 | `proto` | `protobuf` |
| Pug | `pug` | `jade` |
| Puppet | `puppet` | — |
| PureScript | `purescript` | — |
| Python | `python` | `py` |
| QML | `qml` | — |
| QML Directory | `qmldir` | — |
| Qt Style Sheets | `qss` | — |
| R | `r` | — |
| Racket | `racket` | — |
| Raku | `raku` | `perl6` |
| ASP.NET Razor | `razor` | — |
| RBS | `rbs` | `ruby-signature` |
| Windows Registry Script | `reg` | — |
| RegExp | `regexp` | `regex` |
| Rel | `rel` | — |
| RISC-V | `riscv` | — |
| RON | `ron` | — |
| ROS Interface | `rosmsg` | — |
| reStructuredText | `rst` | — |
| Ruby | `ruby` | `rb` |
| Rust | `rust` | `rs` |
| SAS | `sas` | — |
| Sass | `sass` | — |
| Scala | `scala` | — |
| Scheme | `scheme` | — |
| SCSS | `scss` | — |
| 1C (Query) | `sdbl` | `1c-query` |
| ShaderLab | `shaderlab` | `shader` |
| Shell | `shellscript` | `bash`、`sh`、`shell`、`zsh` |
| Shell Session | `shellsession` | `console` |
| GNU Smalltalk | `smalltalk` | — |
| Smithy | `smithy` | — |
| Solidity | `solidity` | — |
| Closure Templates | `soy` | `closure-templates` |
| SPARQL | `sparql` | — |
| Splunk Query Language | `splunk` | `spl` |
| SQL | `sql` | — |
| SSH Config | `ssh-config` | — |
| Stata | `stata` | — |
| Stylus | `stylus` | `styl` |
| SurrealQL | `surrealql` | `surql` |
| Svelte | `svelte` | — |
| Swift | `swift` | — |
| SystemVerilog | `system-verilog` | — |
| Systemd Units | `systemd` | — |
| TalonScript | `talonscript` | `talon` |
| Tasl | `tasl` | — |
| Tcl | `tcl` | — |
| Templ | `templ` | — |
| Terraform | `terraform` | `tf`、`tfvars` |
| TeX | `tex` | — |
| TOML | `toml` | — |
| TypeScript with Tags | `ts-tags` | `lit` |
| TSV | `tsv` | — |
| TSX | `tsx` | — |
| Turtle | `turtle` | — |
| Twig | `twig` | — |
| TypeScript | `typescript` | `ts`、`cts`、`mts` |
| TypeSpec | `typespec` | `tsp` |
| Typst | `typst` | `typ` |
| V | `v` | — |
| Vala | `vala` | — |
| Visual Basic | `vb` | — |
| Verilog | `verilog` | — |
| VHDL | `vhdl` | — |
| Vim Script | `viml` | `vim`、`vimscript` |
| Vue | `vue` | — |
| Vue HTML | `vue-html` | — |
| Vue Vine | `vue-vine` | — |
| Vyper | `vyper` | `vy` |
| WebAssembly | `wasm` | — |
| Wenyan | `wenyan` | `文言` |
| WGSL | `wgsl` | — |
| Wikitext | `wikitext` | `mediawiki`、`wiki` |
| WebAssembly Interface Types | `wit` | — |
| Wolfram | `wolfram` | `wl` |
| XML | `xml` | — |
| XSL | `xsl` | — |
| YAML | `yaml` | `yml` |
| ZenScript | `zenscript` | — |
| Zig | `zig` | — |
