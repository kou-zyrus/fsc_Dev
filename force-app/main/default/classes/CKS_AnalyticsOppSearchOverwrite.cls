public with sharing class CKS_AnalyticsOppSearchOverwrite implements Database.Batchable<SObject>, Database.Stateful {
    // 開発者コンソールによる匿名実行用
    // Id batchJobId = Database.executeBatch(new CKS_AnalyticsOppSearchOverwrite(), 200);

    // 開発者コンソールによるスケジュール設定用
    // public static String CRON_EXP =  '0 43 23 * * ?';
    // String jobId = System.schedule('CKS_AnalyticsOppSearchOverwriteSchedule', CRON_EXP, new CKS_AnalyticsOppSearchOverwriteSchedule());


    // 次回スケジュール登録
    private Boolean isNextBatch = false;

    // コンストラクタ
    public CKS_AnalyticsOppSearchOverwrite() {
        this.isNextBatch = false;
    }

    // コンストラクタ
    public CKS_AnalyticsOppSearchOverwrite(Boolean prmIsNextBatch){
        this.isNextBatch = prmIsNextBatch;
    }

    // DML操作時のエラーメッセージ格納用の変数を宣言
    @TestVisible String externalDataInsertErrorMessage; //externalDataのInsert時のエラーを格納
    @TestVisible String externalDataPartErrorMessage; //externalDataPartのInsert時のエラーを格納
    @TestVisible String externalDataUpdateErrorMessage; //externalDataのUpdate時のエラーを格納

    // InsightsExternalDataオブジェクトを作成
    InsightsExternalData externalData = new InsightsExternalData();

    // バッチ処理の開始時に呼ばれるメソッド
    public Database.QueryLocator start(Database.BatchableContext bc) {
        try {
            // InsightsExternalDataオブジェクトにAction：Noneの状態でレコードを作成
            externalData.EdgemartAlias = 'AchievementManagement_OppSearch_OppAssociatedData'; //データセットのAPI名を設定
            externalData.EdgemartContainer = 'InsightsApplication3'; //格納先アプリケーションを設定
            externalData.MetadataJson = getMetadataJson(); //メタデータJSONを設定
            externalData.Action = 'None';
            externalData.Operation = 'Overwrite';
            insert externalData;
        } catch(Exception e) {
            // メール用にエラーメッセージを取得する
            externalDataInsertErrorMessage = e.getMessage();
        }

        //DatasetExportオブジェクトでレシピから作成された最新のCSVデータのIDを特定
        DateTime x24HoursAgo = DateTime.now().addHours(-24); //バッチ実行時から24時間前の時間を取得
        List<DatasetExport> datasetExport = [
            SELECT Id
            FROM DatasetExport
            WHERE PublisherInfo LIKE '%OUTPUT_AchievementManagement_OppSearch_OppAssociatedData' //PublisherInfoは「毎回変わるID:レシピの出力ノードのAPI名」の形式で設定されている
                  AND CreatedDate >= :x24HoursAgo //過去24時間以内に作成されたデータを取得
            ORDER BY CreatedDate DESC
            LIMIT 1
        ];

        // 上で取得したDatasetExportに紐づくDatasetExportPartを取得しexecuteへListを渡す
        String query;
        if(datasetExport.size() > 0) {
            // 当日実行されたレシピで出力されたデータを取得
            Id datasetExportId = datasetExport[0].Id;
            query = 'SELECT DataFile, PartNumber FROM DatasetExportPart WHERE DatasetExportId = :datasetExportId';

            // テスト実行時はバッチが2回以上回るとエラーが出るためLIMITをバッチサイズ以下に設定する
            if(Test.isRunningTest()){
                query = query + ' LIMIT 1';
            }

        } else {
            // レシピが失敗して当日のデータが存在しない場合、何も取得しない（バッチを実行しない）
            query = 'SELECT DataFile, PartNumber FROM DatasetExportPart LIMIT 0';
        }

        return Database.getQueryLocator(query);
    }

    // バッチ処理の実行時に呼ばれるメソッド
    public void execute(Database.BatchableContext bc, List<SObject> records) {
        // 取得したデータからデータセットを作成
        try {
            // startで取得したDatasetExportPartに格納されているCSVデータを、取得したレコード分InsightsExternalDataPartに格納していく
            List<InsightsExternalDataPart> dataParts = new List<InsightsExternalDataPart>();
            for (SObject record : records) {
                // DatasetExportPartのレコードをキャストする
                DatasetExportPart dep = (DatasetExportPart) record;
                InsightsExternalDataPart dataPart = new InsightsExternalDataPart(
                    DataFile = dep.DataFile,
                    InsightsExternalDataId = externalData.Id,
                    PartNumber = dep.PartNumber + 1 //DatasetExportPartで0 ⇒ InsightsExternalDataPartでは1として登録
                );
                dataParts.add(dataPart);
            }
            insert dataParts;
        } catch(Exception e) {
            // メール用にエラーメッセージを取得する
            externalDataPartErrorMessage = e.getMessage();
        }
    }

    // バッチ処理の実行後に呼ばれるメソッド
    public void finish(Database.BatchableContext bc) {
        // データセット作成処理を開始
        try {
            externalData.Action = 'Process';
            update externalData;
        } catch(Exception e) {
            // メール用にエラーメッセージを取得する
            externalDataUpdateErrorMessage = e.getMessage();
        }

        // DML操作時にエラーが出た場合メールを送信する
        if(externalDataInsertErrorMessage != null) {
            System.enqueueJob(new ErrorEmailJob('データセットの上書き失敗（InsightsExternalDataのInsertで発生）', externalDataInsertErrorMessage));
        } else if(externalDataPartErrorMessage != null) {
            System.enqueueJob(new ErrorEmailJob('データセットの上書き失敗（InsightsExternalDataPartのInsertで発生）', externalDataPartErrorMessage));
        } else if(externalDataUpdateErrorMessage != null) {
            System.enqueueJob(new ErrorEmailJob('データセットの上書き失敗（InsightsExternalDataのUpdateで発生）', externalDataUpdateErrorMessage));
        }
    }

    // 静的リソースとして存在するメタデータJSONを取得
    private static Blob getMetadataJson() {
        StaticResource sr = [SELECT Id, Body FROM StaticResource WHERE Name = 'CKS_AnalyticsOppSearchOverwriteXMD'];
        return sr.Body;
    }

    // エラー時にメールを送信するためのクラス（通常のメソッドだとMIXED_DML_OPERATIONエラーが発生するため、Queueableクラスで非同期処理をすることで回避）
    public with sharing class ErrorEmailJob implements Queueable {
        private String errorMessage;
        private String processName;

        // コンストラクタでエラーメッセージを受け取る
        public ErrorEmailJob(String processName, String errorMessage) {
            this.errorMessage = errorMessage;
            this.processName = processName;
        }

        // execute メソッド内でメールを送信
        public void execute(QueueableContext context) {
            Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage();
            User u = [Select Id, Email FROM User WHERE UserName like 'mlt_camps_recipe@aflac.co.jp.afx%'];
            mail.setToAddresses(new String[] {u.Email});
            mail.setOrgWideEmailAddressId('0D22w000000btG2');
            mail.setSubject('【CAMPS】案件検索データセット作成バッチでエラーが発生しました。');
            mail.setPlainTextBody(
                '以下の処理中にエラーが発生しました。'
                + '\n\nクラス名：CKS_AnalyticsOppSearchOverwrite'
                + '\nエラー内容：' + processName
                + '\nエラー詳細：' + errorMessage
            );
            Messaging.sendEmail(new Messaging.SingleEmailMessage[] { mail });
        }
    }
}
