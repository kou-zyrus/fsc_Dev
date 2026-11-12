import { LightningElement, wire } from "lwc";
import { getRecipes, createDataflowJob } from "lightning/analyticsWaveApi";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import executeBatchJob from "@salesforce/apex/CKS_AnalyticsOppSearchRetry.executeBatchJob";
import getUploadJobStatus from "@salesforce/apex/CKS_AnalyticsOppSearchRetry.getUploadJobStatus";

const TARGET_RECIPE_LABEL = "【CAMPS】案件検索バッチ用CSV作成";
const COOLDOWN_SECONDS = 15; // レシピ完了後の確定待機秒数

export default class CksAnalyticsMaintenanceRetry extends LightningElement {
  targetDataflowId;
  recipeFound = false;

  // ① レシピ用管理プロパティ
  jobId;
  recipePollIntervalId;
  recipeTimerIntervalId;
  recipeCooldownIntervalId;
  isRecipeLoading = false;
  isRecipeStarted = false;
  recipeStatus = "";
  recipeProgressPercent = 0;
  recipeSeconds = 0;
  outputRowCount = null;

  // ② アップロード用管理プロパティ
  uploadJobId = "";
  uploadPollIntervalId;
  uploadTimerIntervalId;
  isUploadLoading = false;
  isUploadStarted = false;
  uploadStatus = "";
  uploadStatusMessage = "";
  uploadOperation = "";
  uploadProgressPercent = 0;
  uploadSeconds = 0;

  // 共通メッセージ
  statusMessage = "初期化中: レシピ情報を検索しています...";
  isError = false;

  // レシピIDの特定
  @wire(getRecipes)
  wiredRecipes({ data, error }) {
    if (data && data.recipes) {
      const target = data.recipes.find((recipe) => recipe.label === TARGET_RECIPE_LABEL);
      if (target) {
        this.targetDataflowId = target.targetDataflowId;
        this.recipeFound = true;
        this.statusMessage = "準備完了: 各ボタンから個別に実行できます。";
      } else {
        this.statusMessage = `エラー: 対象レシピ「${TARGET_RECIPE_LABEL}」が見つかりませんでした。`;
        this.isError = true;
      }
    } else if (error) {
      this.statusMessage = "レシピ一覧取得エラー: " + this.getErrorMessage(error);
      this.isError = true;
    }
  }

  // ==========================================
  // ① レシピ単体実行
  // ==========================================
  handleRecipeButtonClick() {
    if (!this.targetDataflowId) return;

    this.stopRecipeTimers();
    this.isRecipeLoading = true;
    this.isRecipeStarted = true;
    this.isError = false;
    this.recipeProgressPercent = 0;
    this.recipeSeconds = 0;
    this.outputRowCount = null;
    this.jobId = undefined;
    this.recipeStatus = "Queued";
    this.statusMessage = "レシピの実行を開始しています...";

    // レシピ用の秒数タイマー開始
    this.recipeTimerIntervalId = setInterval(() => {
      this.recipeSeconds++;
    }, 1000);

    createDataflowJob({
      dataflowJob: {
        dataflowId: this.targetDataflowId,
        command: "start"
      }
    })
      .then((response) => {
        this.jobId = response.id;
        this.statusMessage = "レシピが起動されました。進捗を監視しています...";

        // 3秒おきにレシピ進捗を監視 (fetch)
        this.recipePollIntervalId = setInterval(() => {
          this.pollRecipeStatus();
        }, 3000);
      })
      .catch((error) => {
        this.stopRecipeTimers();
        this.isRecipeLoading = false;
        this.isError = true;
        this.statusMessage = "レシピ起動エラー: " + this.getErrorMessage(error);
      });
  }

  async pollRecipeStatus() {
    if (!this.jobId) return;

    try {
      const response = await fetch(`/services/data/v60.0/wave/dataflowjobs/${this.jobId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      if (data.outputNodes?.nodes?.length > 0) {
        this.outputRowCount = data.outputNodes.nodes.reduce((acc, node) => acc + (node.rowCount || 0), 0);
      }

      // レシピが内部で成功した場合
      if (data.status === "Success") {
        clearInterval(this.recipePollIntervalId); // 監視ポーリングを停止
        
        // ★ 直ちにSuccessとせず、15秒間の確定待ちカウントダウンへ入る
        this.startRecipeCooldown(COOLDOWN_SECONDS);

      } else if (data.status === "Failure" || data.status === "Warning") {
        this.stopRecipeTimers();
        this.isRecipeLoading = false;
        this.isError = true;
        this.recipeStatus = data.status;
        this.statusMessage = `レシピが警告または失敗で終了しました。(ステータス: ${data.status})`;

      } else if (data.status === "Running") {
        this.recipeStatus = "Running";
        if (data.progress !== undefined && data.progress !== null) {
          // 完了前は最大95%までに留めておく
          this.recipeProgressPercent = Math.min(Math.round(data.progress * 100), 95);
        }
        this.statusMessage = `レシピを実行中です... (${this.recipeProgressPercent}%)`;

      } else {
        this.recipeStatus = data.status;
      }

    } catch (error) {
      this.stopRecipeTimers();
      this.isRecipeLoading = false;
      this.isError = true;
      this.statusMessage = "レシピ監視エラー: " + this.getErrorMessage(error);
    }
  }

  // ★ 追加: レシピ完了後の15秒確定待機処理
  startRecipeCooldown(seconds) {
    let remaining = seconds;
    this.recipeStatus = "Finalizing"; // バッジを「確定処理中」にする
    this.recipeProgressPercent = 98;  // バーをほぼ完了状態にする
    this.statusMessage = `レシピ処理完了。CSVファイルの完全確定を待機しています (残り ${remaining} 秒)...`;

    this.recipeCooldownIntervalId = setInterval(() => {
      remaining--;
      if (remaining > 0) {
        this.statusMessage = `レシピ処理完了。CSVファイルの完全確定を待機しています (残り ${remaining} 秒)...`;
      } else {
        // 15秒経過して初めて「完了 (Success)」にする
        this.stopRecipeTimers();
        this.recipeStatus = "Success";
        this.recipeProgressPercent = 100;
        this.isRecipeLoading = false;
        this.statusMessage = "レシピおよびCSVファイルの確定が正常に完了しました！続けて②のデータセット反映を実行できます。";
        this.showToast("Success", "レシピが正常に完了しました", "success");
      }
    }, 1000);
  }

  // ==========================================
  // ② CSVアップロードバッチ単体実行
  // ==========================================
  async handleUploadButtonClick() {
    this.stopUploadTimers();
    this.isUploadLoading = true;
    this.isUploadStarted = true;
    this.isError = false;
    this.uploadProgressPercent = 10;
    this.uploadSeconds = 0;
    this.uploadJobId = "";
    this.uploadStatus = "New";
    this.uploadStatusMessage = "";
    this.statusMessage = "Apexバッチを起動しています...";

    // アップロード用の秒数タイマー開始
    this.uploadTimerIntervalId = setInterval(() => {
      this.uploadSeconds++;
    }, 1000);

    try {
      await executeBatchJob();
      this.statusMessage = "Apexバッチを開始しました。データセットへの反映完了を待機中...";

      // 3秒おきに InsightsExternalData を監視
      this.uploadPollIntervalId = setInterval(() => {
        this.pollUploadStatus();
      }, 3000);

    } catch (error) {
      this.stopUploadTimers();
      this.isUploadLoading = false;
      this.isError = true;
      this.statusMessage = "バッチ起動エラー: " + this.getErrorMessage(error);
    }
  }

  async pollUploadStatus() {
    try {
      const job = await getUploadJobStatus();
      if (!job) return;

      this.uploadJobId = job.Id;
      this.uploadStatus = job.Status;
      this.uploadStatusMessage = job.StatusMessage || "";
      this.uploadOperation = job.Operation || "";

      if (job.Status === "Completed") {
        this.uploadProgressPercent = 100;
        this.stopUploadTimers();
        this.isUploadLoading = false;
        this.statusMessage = "データセットへの反映がすべて正常に完了しました！";
        this.showToast("Success", "データセットの更新が完了しました", "success");

      } else if (job.Status === "CompletedWithWarnings") {
        this.uploadProgressPercent = 100;
        this.stopUploadTimers();
        this.isUploadLoading = false;
        this.statusMessage = "データセットへの反映が警告付きで完了しました。";
        this.showToast("Warning", "警告付きで完了しました", "warning");

      } else if (job.Status === "Failed" || job.Status === "NotProcessed") {
        this.stopUploadTimers();
        this.isUploadLoading = false;
        this.isError = true;
        this.statusMessage = `データセットの反映に失敗しました: ${job.StatusMessage || ""}`;

      } else if (job.Status === "InProgress") {
        this.uploadProgressPercent = 65;
        this.statusMessage = "データセットへ反映中 (InProgress)...";

      } else if (job.Status === "Queued" || job.Status === "New") {
        this.uploadProgressPercent = 30;
        this.statusMessage = "データセット反映キューで待機中...";
      }

    } catch (error) {
      this.stopUploadTimers();
      this.isUploadLoading = false;
      this.isError = true;
      this.statusMessage = "アップロード監視エラー: " + this.getErrorMessage(error);
    }
  }

  // --- タイマークリア ---
  stopRecipeTimers() {
    if (this.recipePollIntervalId) clearInterval(this.recipePollIntervalId);
    if (this.recipeTimerIntervalId) clearInterval(this.recipeTimerIntervalId);
    if (this.recipeCooldownIntervalId) clearInterval(this.recipeCooldownIntervalId);
  }

  stopUploadTimers() {
    if (this.uploadPollIntervalId) clearInterval(this.uploadPollIntervalId);
    if (this.uploadTimerIntervalId) clearInterval(this.uploadTimerIntervalId);
  }

  disconnectedCallback() {
    this.stopRecipeTimers();
    this.stopUploadTimers();
  }

  formatSeconds(sec) {
    if (!sec) return "0秒";
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return mins > 0 ? `${mins}分 ${secs}秒` : `${secs}秒`;
  }

  // --- UIゲッター ---

  get isRecipeButtonDisabled() {
    return this.isRecipeLoading || !this.recipeFound;
  }

  get isUploadButtonDisabled() {
    return this.isUploadLoading;
  }

  get formattedRecipeDuration() {
    return this.formatSeconds(this.recipeSeconds);
  }

  get formattedUploadDuration() {
    return this.formatSeconds(this.uploadSeconds);
  }

  get jobIdDisplay() {
    return this.jobId || "-";
  }

  get uploadJobIdDisplay() {
    return this.uploadJobId || "生成中...";
  }

  get uploadOperationDisplay() {
    return this.uploadOperation || "Overwrite";
  }

  get rowCountDisplay() {
    return this.outputRowCount !== null ? `${this.outputRowCount.toLocaleString()} 件` : "集計中...";
  }

  get recipeStatusLabel() {
    const map = {
      Queued: "待機中 (Queued)",
      Running: "実行中 (Running)",
      Finalizing: "ファイル確定待機中...",
      Success: "完了 (Success)",
      Failure: "失敗 (Failure)",
      Warning: "警告 (Warning)"
    };
    return map[this.recipeStatus] || this.recipeStatus;
  }

  get uploadStatusLabel() {
    const map = {
      New: "バッチジョブ作成済 (New)",
      Queued: "待機中 (Queued)",
      InProgress: "反映中 (InProgress)",
      Completed: "反映完了 (Completed)",
      CompletedWithWarnings: "警告終了",
      Failed: "失敗 (Failed)",
      NotProcessed: "中止 (NotProcessed)"
    };
    return map[this.uploadStatus] || this.uploadStatus;
  }

  get recipeBadgeClass() {
    const base = "slds-badge ";
    if (this.recipeStatus === "Success") return base + "slds-theme_success";
    if (this.recipeStatus === "Running" || this.recipeStatus === "Queued" || this.recipeStatus === "Finalizing") return base + "slds-theme_warning";
    if (this.recipeStatus === "Failure") return base + "slds-theme_error";
    return base;
  }

  get uploadBadgeClass() {
    const base = "slds-badge ";
    if (this.uploadStatus === "Completed") return base + "slds-theme_success";
    if (this.uploadStatus === "InProgress" || this.uploadStatus === "Queued" || this.uploadStatus === "New") return base + "slds-theme_warning";
    if (this.uploadStatus === "Failed") return base + "slds-theme_error";
    return base;
  }

  get recipeProgressBarVariant() {
    return this.recipeStatus === "Failure" ? "expired" : "base";
  }

  get uploadProgressBarVariant() {
    return this.uploadStatus === "Failed" ? "expired" : "base";
  }

  get messageAlertClass() {
    return this.isError
      ? "slds-notify slds-notify_alert slds-alert_error slds-var-m-top_small"
      : "slds-notify slds-notify_alert slds-theme_alert-texture slds-theme_info slds-var-m-top_small";
  }

  showToast(title, message, variant) {
    try {
      this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    } catch (e) {
      console.log(`[Toast ${variant}] ${title}: ${message}`);
    }
  }

  getErrorMessage(error) {
    if (error?.body?.message) return error.body.message;
    if (error?.message) return error.message;
    return JSON.stringify(error);
  }
}