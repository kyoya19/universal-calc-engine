# Naming policy

This project separates international technical names, Japanese names, and short codenames.

## Naming layers

| Layer | Purpose | Example |
| --- | --- | --- |
| International technical name | Public docs, APIs, package-facing explanations | Outcome Return Function |
| Japanese name | Japanese planning and domestic explanation | 成果還元関数 |
| Codename | Short internal reference and product identity | Kiyotan / Seikatan |

## Initial glossary

| International technical name | Japanese name | Codename | Role |
| --- | --- | --- | --- |
| Outcome Return Function | 成果還元関数 | - | General model for attributing outcome value to state transitions, actions, and observations. |
| Forward Outcome Engine | 順方向成果計算エンジン | Kiyotan | Forward calculation layer for expected value, win rate, hourly value, and contribution. |
| Inverse Outcome Estimator | 逆方向成果推定エンジン | Seikatan | Reverse estimation layer for inferring model parameters from observed data. |

## Current rename boundary

Do not rename public APIs, file names, or existing test names in the same PR as this document.

The immediate boundary is naming design only. Code-level rename work must wait until solver target policy and public output boundaries are stable.
