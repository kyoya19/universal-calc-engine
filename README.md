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

## Verification

```bash
npm run typecheck
npm test
```

本プロジェクトはツモロジ（仮）のマネタイズ企画そのものではなく、同企画にも利用され得る中核計算エンジンの実装を目的とします。
