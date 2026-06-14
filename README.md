# universal-calc-engine

汎用確率状態遷移モデルに基づく万能計算機プロジェクトです。

このリポジトリでは、まずすごろくPoC v0.3を通じて、DefinitionModel → ExpandedModel → EvaluatedModel → SolvedModel → OutputResult → ContributionResult の最小実装を検証します。

## Current focus

現在の焦点は、すごろくPoC v0.4の境界整理です。

v0.3 は、explicit-only solver execution と state generation / graph diagnostics を併存させる完成チェックリストを回帰テストで固定済みです。

v0.4 では、代表すごろくモデルのfixture化と graph diagnostics 出力整備を優先します。`generatedTo` を solver target にする作業は、引き続き現在の境界外です。

詳細は以下を参照してください。

- [Sugoroku PoC v0.3](docs/sugoroku-poc-v0.3.md)
- [Sugoroku PoC v0.4 Boundary](docs/sugoroku-poc-v0.4-boundary.md)
- [State Space Expansion Design](docs/state-space-expansion.md)
- [成果還元関数](docs/outcome-return-function.md)
- [成果還元関数 roadmap](docs/outcome-roadmap.md)
- [成果還元関数 external brief](docs/outcome-external-brief.md)
- [成果還元関数 rename inventory](docs/outcome-rename-inventory.md)
- [成果還元関数 code rename candidates](docs/outcome-code-rename-candidates.md)
- [成果還元関数 rename checkpoint](docs/outcome-rename-checkpoint.md)
- [成果還元関数 current identifier map](docs/outcome-current-identifier-map.md)
- [成果還元関数 reference-search checklist](docs/outcome-reference-search-checklist.md)
- [State note](docs/state-note.md)
- [GT note](docs/gt-note.md)
- [RM note](docs/rm-note.md)
- [Reference notes checkpoint](docs/ref-cp.md)
- [Pre-rename boundary](docs/pre-rename-boundary.md)
- [Pre-rename boundary README link checkpoint](docs/pre-link-checkpoint.md)
- [State generation reference note](docs/state-ref.md)
- [Rename second stage entry](docs/rename-second-stage-entry.md)
- [Rename second stage README link checkpoint](docs/rename-second-stage-link-checkpoint.md)
- [ID readiness](docs/identifier-rename-readiness.md)
- [ID cp](docs/id-readiness-link-checkpoint.md)
- [Groups](docs/id-candidate-groups.md)
- [G](docs/groups-cp.md)
- [Pub](docs/pub.md)
- [cp](docs/pub-cp.md)
- [I](docs/int.md)
- [Int checkpoint](docs/int-cp.md)
- [Files](docs/files.md)
- [fcp](docs/fcp.md)
- [D](docs/d.md)
- [dc](docs/dc.md)
- [L](docs/l.md)
- [M](docs/m.md)
- [o](docs/o.md)
- [P](docs/p.md)
- [R](docs/r.md)
- [T](docs/t.md)
- [u](docs/u.md)
- [W](docs/w.md)

追加の review note は `docs/x.md` を参照してください。
追加の docs note は `docs/y.md` を参照してください。
追加の docs note は `docs/z.md` も参照してください。
追加の docs note は `docs/aa.md` を参照してください。
追加の docs note は `docs/ab.md` を参照してください。
追加の docs note は `docs/ac.md` を参照してください。
追加の docs note は `docs/ae.md` を参照してください。
追加の docs note は `docs/af.md` を参照してください。
追加の docs note は `docs/ag.md` を参照してください。
追加の docs note は `docs/a%69.md` を参照してください。
追加の docs note は 461 番の追加ファイルを参照してください。
More docs note added.
追加の docs note は `docs/al.md` を参照してください。
追加の docs note は `docs/am.md` を参照してください。
追加の docs note は `docs/an.md` を参照してください。
追加の docs note は `docs/ao.md` を参照してください。
追加の docs note は `docs/a%70.md` を参照してください。
追加の docs note は `docs/a%71.md` を参照してください。
追加の docs note は `docs/a%72.md` を参照してください。
追加の docs note は 1902 番の追加ファイルを参照してください。
追加の docs note は 4b840d3 番の追加ファイルを参照してください。
More docs note added again.
Followup note added.
Docs note added.
Entry note added.
B9 note added.
C9 note added.
N9 note added.
P10 note added.
More docs note added once more.
S10 note added.
T10 note added.
More docs note added later.
More docs note added next.
A11 note added.
More docs note added now.
More docs note added now.
More docs note recorded.
More docs note recorded.
More docs note recorded.
More docs note captured.
More docs note captured.
More docs note captured.
More docs note logged.
D12 note added.
E12 note added.
G12 note added.
Trail note added.
V11 note added.
J12 note added.
M12 note added.
N12 note added.
O12 note added.
Q12 note added.
More docs note logged again.
Note 12 added.
Follow note added.
Next record added.
Mark note added.
Addendum note added.
More note added.
Brief note added.
Next 2 note added.
More note logged.
S note added.
U note added.
V note added.
W note added.
N508 note added.
N510 note added.
Entry added.
More added.
QX added.
RA added.
S added.
T added.
U added.
V added.
Note added.
K added.
P added.
Q added.
Z added.
R1 added.
T1 added.
U1 added.
N added.
O added.
P3 added.
Q3 added.
R3 added.
S3 added.
T3 added.
U3 added.
V3 added.
W3 added.
X3 added.
Y3 added.
Z3 added.
A4 added.
B4 added.
C4 added.
D4 added.
E4 added.
F4 added.
G4 added.
H4 added.
I4 added.
J4 added.
K4 added.
L4 added.
M4 added.
N4 added.
O4 added.
P4 added.
Q4 added.
R4 added.
S4 added.
T4 added.
U4 added.
V4 added.
W4 added.
X4 added.
Y4 added.
Z4 added.
A5 added.
B5 added.
C5 added.
D5 added.
E5 added.
F5 added.
G5 added.
H5 added.
I5 added.
J5 added.
K5 added.
L5 added.
M5 added.
N5 added.
O5 added.
P5 added.
Q5 added.
R5 added.
S5 added.
T5 added.
U5 added.
V5 added.
W5 added.
X5 added.
Y5 added.
Z5 added.
A6 added.
B6 added.
C6 added.

## Verification

```bash
npm run typecheck
npm test
```

本プロジェクトはツモロジ（仮）のマネタイズ企画そのものではなく、同企画にも利用され得る中核計算エンジンの実装を目的とします。
