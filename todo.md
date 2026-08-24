# Connexy 開発タスク＆やることリスト (todo.md)

本プロジェクトにおける機能追加・改善タスク、および将来的なコンプライアンス強化に向けたロードマップです。

## 📋 将来的な計画・対応予定タスク

### 🚨 緊急: `.env` の秘密情報がgit管理下で漏洩している
`.env` が `.gitignore` に含まれておらず、実際の値のままGitHubリポジトリにコミット・pushされている状態(2026-08-24発見、[PR #1](https://github.com/seals-applications/connexy/pull/1) 対応中に発覚)。

- [x] `.env` を `.gitignore` に追加する
- [x] `git rm --cached .env` でgit管理から除外する
- [x] `.env.example`(ダミー値)を追加する
- [ ] `.env.example` をREADMEからリンクする(PR #1のREADME改修とあわせて対応)
- [ ] Google Maps APIキー(`VITE_GOOGLE_MAPS_API_KEY`)にHTTPリファラー制限をかける、または新しいキーに差し替える
- [ ] Supabase anon key(`VITE_SUPABASE_ANON_KEY`)をローテーションし、対象テーブルのRLSポリシーを確認・強化する
- [ ] 必要であれば過去のcommit履歴からも秘密情報を除去する(`git filter-repo`等)

⚠️ **注意**: 上記のgit管理からの除外は今後のコミットに`.env`が含まれなくなるだけで、**過去のコミット履歴には既に実際のキーが残ったまま**です。GitHub上で既に公開されてしまった鍵そのものを無効化するには、上記のAPIキーのローテーション/制限が別途必須です。

### 🔐 セキュリティ・情報保護(プライバシーマーク取得準備)
- [ ] **将来的なプライバシーマーク（Pマーク）の取得対応**
  - [ ] **位置情報（GPS）取得の明確な同意取得フロー**:
    - [ ] GPS打刻時に、位置情報の取得目的（出勤確認目的のみに使用等）を明記したポップアップ表示と初回同意確認機能の実装。
  - [ ] **チャット内の個人情報保護強化**:
    - [ ] `maskContactInfo` 関数による電話番号・メールアドレス等の自動マスキング（伏字化）ロジックの判定精度の向上。
  - [ ] **データベースアクセスのセキュリティ強化**:
    - [ ] SupabaseのRLS（Row Level Security / 行レベルセキュリティ）ポリシーの再検証と、企業間でのデータ完全分離の厳密化。
    - [ ] 保存データ（個人情報関連カラム）の暗号化の検討。
  - [ ] **個人情報保護規定（PMS）関連の文書化支援**:
    - [ ] システム内の個人情報保護管理規定（取扱手順）のドキュメント作成。

### 🧩 仕様書作成時に見つかった、対応容易ではない不備・未実装事項
- [ ] 案件の新規作成・編集・複製フォームの導線が「管理」画面内に見当たらない(別画面がある想定だが要確認)
- [ ] Talentの実名(`name`)がUI非表示なのにクライアント側データには含まれている(実バックエンド接続時にAPI層でのマスキングが必要)
- [ ] Google Maps(表示)とNominatim/OpenStreetMap(ジオコーディング)のプロバイダ混在(利用規約・レート制限リスク)
- [ ] エリア検索が新宿・渋谷・池袋の3エリア固定で、地図連携があるのに半径検索ができない
- [ ] 異議あり(`disputed`)を「管理」画面から解消する導線が見当たらない
- [ ] ダッシュボードの入出金額・手数料内訳が固定値表示で、実際の`price`/手数料率からの計算になっていない
- [ ] GPS打刻が実測位ではなく「シミュレーターON/OFF」のみ
- [ ] 分析・ダッシュボードの指標が2つのみで、スタッフ向けメニュー説明にある「獲得報酬総額」「高評価率」が未実装
- [ ] 決済連携(Stripe)が「デモモードです」アラートのみのスタブ
- [ ] 出勤管理のNG日設定カレンダーが「2026年7月」に固定、年月選択ができない
- [ ] 選考時の候補企業スコアリングが4社の固定モックデータで、実際の登録企業を検索していない

---

## ✅ 完了済みのタスク

### 🐛 発見・修正済みのバグ(2026-08-24)
- [x] **案件応募時のシステムメッセージの発注企業名が、ハードコードされた4社以外だと汎用テキスト「パートナー企業」になり、4社分の名前も実際の登録名と食い違っていた問題を修正**
  - `handleJobApplication` 内のハードコードされた三項演算子チェーンを、同ファイル内の他箇所と同じ `allUsers.find(u => u.id === selectedJob.authorId)?.name` によるルックアップに置き換え ([src/pages/SearchPage.tsx](src/pages/SearchPage.tsx))。
- [x] **CSV一括登録(案件・人材)で、フィールド内にカンマが含まれていると列がずれる問題を修正**
  - クォート・エスケープに対応した簡易CSVラインパーサー `parseCsvLine` を追加し、`line.split(',')` を置き換え ([src/pages/SearchPage.tsx](src/pages/SearchPage.tsx))。Node上でクォート付きカンマ・エスケープ済みダブルクォートの3パターンを検証済み。
- [x] **「応募状況・履歴」で、同じチャット内の複数応募の応募日が使い回される問題を修正**
  - `evaluations.appliedJobIds` に加えて案件ごとの応募日を保持する `evaluations.appliedJobDates: { [jobId]: dateString }` を新設 ([src/data/mockDb.ts](src/data/mockDb.ts) `saveContractTaskChat`)。
  - 「応募状況・履歴」画面は `t.date`(チャット作成日)ではなく `appliedJobDates[jobId]` を参照するよう修正 ([src/pages/ManagementPage.tsx](src/pages/ManagementPage.tsx) `myApplications`)。
- [x] **完了報告(遅刻なし)提出時に出勤ログの出勤時間が`undefined`になる問題を修正**
  - 完了報告フローで生成する出勤ログタグを、他の生成箇所と同じ `ATTENDANCE_LOG_<日付>_<時刻>_<OK|LATE>` の3セグメント形式に統一 ([src/pages/ManagementPage.tsx](src/pages/ManagementPage.tsx) `handleReportSubmit`)。
- [x] **国際表記(+81-90-...)の電話番号がチャットの連絡先マスキングをすり抜ける問題を修正**
  - `maskContactInfo` の電話番号用正規表現に任意の `+81` 国番号プレフィックスを許容するパターンを追加し、国内・国際どちらの表記でもマスキングされることをブラウザで確認済み ([src/pages/MessagePage.tsx](src/pages/MessagePage.tsx))。
- [x] **分析・ダッシュボードが自社データではなく全社(プラットフォーム全体)のデータを集計していた問題を修正**
  - 未絞り込みの `tasks` ではなく、自社分に絞り込み済みの `relatedTasks` を集計に使うよう修正 ([src/pages/ManagementPage.tsx](src/pages/ManagementPage.tsx))。
- [x] **設定画面「自社プロフィール編集」で、インボイス登録番号だけ編集内容が保存されない問題を修正**
  - インボイス番号欄が `defaultValue` の非制御入力で `onChange` も無く、`handleProfileSave` の保存対象にも含まれていなかったため、編集して「保存」を押しても変更が破棄されていた。他の項目と同様に `invoiceNumberInput` state を追加し `value`/`onChange` で制御、保存処理にも追加 ([src/components/SettingsDrawer.tsx](src/components/SettingsDrawer.tsx))。
- [x] **新規会社登録申請フォームの「代表者名」が、入力しても保存されない問題を修正**
  - フォーム自体は state・`onChange` を備えていたが、`handleSignupSubmit` が `api.registerCompany` 呼び出し時に `representativeName` を渡していなかった。加えて `registerCompany` 側もこのフィールドをローカルストレージ・DB行のどちらにも保存していなかったため、渡しても永続化されなかった。両方を修正し、代表者名を入力欄の値で送信・保存するよう対応 ([src/pages/LoginPage.tsx](src/pages/LoginPage.tsx), [src/data/mockDb.ts](src/data/mockDb.ts) `registerCompany`)。
- [x] **マッチング成立後（`working`/`completed`）のチャットで、連絡先の自動マスキングが解除されない問題を修正**
  - `maskContactInfo` は `status === 'contracted'` のみをマスキング除外対象にしていたが、応募→内定→承諾のフローで成立したチャットは実際には `working`（進行中）や `completed`（完了）ステータスになり、`contracted` には決してならない。同ファイル内の氏名表示ロジック（`isClient || status === 'group' || status === 'contracted' || status === 'working' || status === 'completed'`）と同じ判定基準に合わせ、`working`/`completed` もマスキング除外に追加 ([src/pages/MessagePage.tsx](src/pages/MessagePage.tsx) `maskContactInfo`)。
- [x] **チャット内の経費申請・手配情報共有・写真送信・精算承認/差戻しで、取引先企業名がハードコードされたalpha/beta/sigma以外だと汎用テキストになっていた問題を修正**
  - 案件応募時のシステムメッセージで既に修正済みだった「ハードコードされた三項演算子チェーンで企業名を決め打ちする」バグと同種のものが、`handleSendReceipt`・`handleSendArrangement`・`handleSendPhoto`・`handleApproveReceipt`・`handleRejectReceipt` の5箇所に残っていた。チャットIDから相手企業IDを取り出し `allCompanies.find` で解決する方式に統一 ([src/pages/MessagePage.tsx](src/pages/MessagePage.tsx))。
- [x] **契約書未承認バナー表示中、チャット冒頭のメッセージが固定ヘッダーの下に隠れる問題を修正**
  - チャットヘッダーは `position: absolute` かつ高さ可変で、メッセージ一覧側は `headerHeight`(見積り値)を`paddingTop`として確保しているが、「契約書が未承認です」バナーの表示条件がこの見積りに含まれていなかった。バナー表示条件と同じ条件でheaderHeightに加算するよう修正 ([src/pages/MessagePage.tsx](src/pages/MessagePage.tsx) `headerHeight`)。
- [x] **案件投稿フォームで「すべての稼働日で同じ単価を設定する」を一度オフにして日程別単価を入力後、再度オンにすると全日程の単価が未入力状態(0円)の共通単価で上書きされ、入力済みの単価が消える問題を修正**
  - チェックボックスをオンにする瞬間、既存の日程別単価から代表値を引き継いでから同期するよう変更し、意図せず0円で全日程が上書きされることを防止 ([src/pages/SearchPage.tsx](src/pages/SearchPage.tsx) `handleToggleSamePrice`)。
- [x] **スタッフ登録時に人材(Talent)としても登録する際の「希望勤務日」が年なし・ゼロ埋めなしの `M/D` 形式で保存され、表示時の日付ソート・連続日程のとりまとめが壊れる問題を修正**
  - 案件の`eventDate`と異なり、この画面だけ独自に年なし`M/D`形式へ変換してから保存していたため、共通の表示ユーティリティ`formatJobDates`（`YYYY-MM-DD`前提でソート・Date変換する)に渡すと文字列としての辞書順ソートが崩れていた。`eventDate`と同じくISO形式のまま保存し、表示側で`formatJobDates`を通すよう統一 ([src/pages/SearchPage.tsx](src/pages/SearchPage.tsx))。
- [x] **CSV一括登録のプレビュー画面で、列数不足の行が無言でスキップされ、以降の行のエラー表示がずれて別の行に表示される問題を修正**
  - エラーの`rowIndex`が元ファイルの行番号(空行や列数不足行を含む)基準、プレビュー表の行番号が実際に取り込めた行の並び順基準と、2つの異なる基準で採番されていたため、一度でも行がスキップされるとズレて無関係な行にエラーメッセージが表示されていた。両者を同じ「表示行番号」カウンタで揃え、列数不足の行もプレースホルダーとしてプレビューに表示してエラー内容を確認できるよう修正 ([src/pages/SearchPage.tsx](src/pages/SearchPage.tsx) `handleCsvFileUpload`)。

### 🔧 仕様上の不備の解消(2026-08-24)
- [x] **ログイン画面のデバッグパネルから、全社・全スタッフの平文ログインID/パスワード表示を削除**
  - 会社承認(承認/却下/保留)機能自体は他に代替手段がないため維持しつつ、認証情報の平文表示のみを削除([src/pages/LoginPage.tsx](src/pages/LoginPage.tsx))。本番リリース前には、この管理ツール自体を認証済み管理者専用の別画面に移す対応が別途必要。
- [x] **アカウント承認ステータス(`pending`/`rejected`)のルートガードをアプリ全体に追加**
  - これまではログイン処理の中でのみ`pending`/`rejected`を弾いており、既にログイン済みのセッションが後から承認取り消しされた場合にアプリ側で検知できていなかった。`App.tsx`の起動時ユーザー確認処理でも`status !== 'approved'`なら強制ログアウトするよう修正([src/App.tsx](src/App.tsx))。
- [x] **内定「辞退」と「不採用」が同じ`rejected`ステータスで区別できない問題を解消**
  - `ContractTask.status`に`declined`を追加し、応募者側の辞退操作(`handleDeclineUnofficialOffer`)は`declined`を書き込むよう変更。関連するバッジ表示・ボタン制御箇所を対応([src/data/mockDb.ts](src/data/mockDb.ts), [src/pages/MessagePage.tsx](src/pages/MessagePage.tsx))。「応募状況・履歴」画面は元々`rejected`/`declined`の両方を「見送り/辞退」として表示する実装だったため、表示側の変更は不要だった。

### 📱 ダッシュボード・入出金管理機能の刷新
- [x] **「入金予定額」および「振込予定額」カードの追加・実装** (`src/pages/DashboardPage.tsx`)
  - [x] 稼働月の翌月末の支払いサイクルに基づいた動的な月名表記（例：「7月入金予定額（6月稼働分）」）の自動算出。
  - [x] 予定額カードをタップした際の詳細明細画面（サブビュー）へのアニメーション遷移の実装。
  - [x] 明細画面における戻るボタン（`arrow_back_ios_new`）の配置・カラー・挙動の修正。
- [x] **予定詳細における手数料等の差し引き計算の追加** (`src/pages/DashboardPage.tsx`)
  - [x] 入金予定明細での売上総額表示。
  - [x] 振込予定明細における「10%マッチング手数料（自動計算）」および「7.5%早期出金手数料（即時振込申請時）」の差し引き内訳表示。
  - [x] 早期出金（即時振込）申請モックアクションの実装。

### 🏷️ 案件識別・案件コードの自動発行
- [x] **一意の「案件コード (jobCode)」の自動生成と各画面への統合**
  - [x] 新規案件掲載（作成）時に自動で `JOB-XXXXXX` 形式のコードを自動発行・保存するロジックの実装 (`src/data/mockDb.ts`)。
  - [x] 過去のシード案件に対しても一意のハッシュから固定コードを自動算出するフォールバック処理の実装 (`src/data/mockDb.ts`)。
  - [x] 案件一覧、詳細モーダル、チャットの条件ヘッダー、内定通知、およびダッシュボード明細内における `【JOB-XXXXXX】` 形式への表記置換。
  - [x] 日次出勤ログへの案件コード付与と、CSV出力時の「案件コード」列の追加 (`src/pages/TaskPage.tsx`)。

### 💬 トークルーム（チャット）内のUI改善・内定オファーのモーダル化
- [x] **チャット画面ヘッダーの整理** (`src/pages/MessagePage.tsx`)
  - [x] 「同期（更新）」および「通報」ボタンの非表示化と右側のスペーサー配置。
  - [x] スクロールバーの上下矢印（ボタン）の非表示化の強化 (`src/index.css`)。
- [x] **内定通知オファーの吹き出し表示統合** (`src/pages/MessagePage.tsx`)
  - [x] チャット中央のシステムメッセージ表示から、送信者・受信者の吹き出し内カードデザインへの変更。
  - [x] プレミアム感のあるゴールドを基調としたカードデザインと「内定通知を開く」ボタンの配置。
- [x] **確認・承諾・辞退のダブル確認フローモーダルの実装** (`src/pages/MessagePage.tsx`)
  - [x] ボタンタップ時に立ち上がる詳細プレビュー（企業名、案件、単価、日程、勤務地）の実装。
  - [x] 「承諾」「辞退」それぞれの決定時に誤操作を防ぐ「最終確認画面」へのモーダル内画面遷移。
- [x] **参加メンバー一覧表示モーダルの追加** (`src/pages/MessagePage.tsx`)
  - [x] チャット右上ヘッダーへのメンバー一覧ボタン（グループアイコン）の追加と一覧モーダルの実装。
- [x] **「経費申請」への表記統一と制限解除** (`src/pages/MessagePage.tsx`)
  - [x] 「領収書提出」から「経費申請」への文言変更。
  - [x] 交通費・宿泊費の別途支給設定の有無に関わらず、全ての案件で経費申請を行えるよう制限を撤廃。
