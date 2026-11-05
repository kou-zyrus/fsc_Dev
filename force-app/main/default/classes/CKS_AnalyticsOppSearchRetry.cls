public with sharing class CKS_AnalyticsOppSearchRetry {

    /**
     * ① レシピ完了後にLWCから呼ばれるバッチ実行メソッド
     */
    @AuraEnabled
    public static Id executeBatchJob() {
        try {
            Id batchJobId = Database.executeBatch(new CKS_AnalyticsOppSearchOverwrite(), 200);
            return batchJobId;
        } catch (Exception e) {
            throw new AuraHandledException('バッチの起動に失敗しました: ' + e.getMessage());
        }
    }

    /**
     * ② 特定のアップロードジョブ（AchievementManagement_OppSearch_OppAssociatedData...）のみを監視
     * 公式項目のみを使用: Id, Status, StatusMessage, EdgemartAlias, EdgemartLabel, Operation, CreatedDate
     */
    @AuraEnabled
    public static InsightsExternalData getUploadJobStatus() {
        try {
            List<InsightsExternalData> jobs = [
                SELECT Id, Status, StatusMessage, EdgemartAlias, EdgemartLabel, Operation, CreatedDate
                FROM InsightsExternalData
                WHERE (
                    EdgemartAlias LIKE '%AchievementManagement_OppSearch_OppAssociatedData%'
                    OR EdgemartLabel LIKE '%AchievementManagement_OppSearch_OppAssociatedData%'
                    OR Description LIKE '%AchievementManagement_OppSearch_OppAssociatedData%'
                )
                AND CreatedDate >= :Datetime.now().addHours(-1)
                ORDER BY CreatedDate DESC
                LIMIT 1
            ];

            if (!jobs.isEmpty()) {
                return jobs[0];
            }
            return null;
        } catch (Exception e) {
            throw new AuraHandledException('アップロードステータス取得失敗: ' + e.getMessage());
        }
    }
}