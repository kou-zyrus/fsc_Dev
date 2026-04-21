/**
 * @description
 * <p><b>目的</b></p>
 * CAMPSデータ移行依頼のLightning Web Componentで使用するサーバー側処理を集約したクラス。<br/>
 * データ移行依頼オブジェクトに関する処理を行う<br/>
 */
@SuppressWarnings('PMD.CognitiveComplexity, PMD.CyclomaticComplexity, PMD.ExcessiveClassLength, PMD.StdCyclomaticComplexity, PMD.NcssTypeCount')
public with sharing class CKS_CTRL_DataMigrationRequest {

    //テスト用の変数。Exception処理を実行させるために使用する
    @TestVisible
    private static Boolean throwError = false;
    //テスト用の変数。SystemDateを設定するために使用する
    @TestVisible
    private static Date testSystemDate = null;

    @SuppressWarnings('PMD.FieldNamingConventions')
    private static String ERR_PARAMETER = '入力可能な文字：全角カナ、全角英数字、（、）、‐、－、ー';

    /**
     * @description
     * 申込新規作成時に必要な申込基本情報を取得する
     * @param kihonId 申込基本情報レコードID
     * @return 申込基本情報レコード情報
     * @see dgkMoshikomiShosaiRecordCreateEdit
     */
    @SuppressWarnings('PMD.NcssMethodCount')
    @AuraEnabled(cacheable=false)
    // public static CreateSetupData getCreateSetupData (String requestId) {

    // }
    public static void getCreateSetupData (String requestId) {

    }

    /**
     * @description
     * 申込詳細情報編集時に必要な申込詳細情報レコード関連の情報を取得する
     * @param recordId 申込詳細情報のレコードのID
     * @return 申込詳細情報レコード情報
     * @see dgkMoshikomiShosaiRecordCreateEdit
     * @see dgkMoshikomiShosaiRecordDetail
     */
    @AuraEnabled(cacheable=false)
    public static DataMigrationRequest__c getEditSetupData (String recordId) {
        try{

            List<DataMigrationRequest__c> result = [ SELECT
                Id,
                Name,
                MigrationType__c,
                MigrationDate__c,
                AssociateCode__c,
                MigrationAssociateCode__c,
                ExistingContractCustomerNotes__c,
                Individual__c,
                MasterGroupCustomerNotes__c,
                ChildGroup__c,
                Household__c,
                Relative__c,
                Campaign__c,
                OtherCompany__c,
                Opportunity__c,
                GraspIntention__c,
                PersonalInformationHandling__c,
                DailyReport__c,
                Event__c,
                Task__c,
                AttachmentDoc__c,
                TargetManagement__c,
                LastModifiedDate
                FROM DataMigrationRequest__c
                WHERE Id = :recordId
            ];
            if(result.isEmpty()){
                throw new DataMigrationRequestException('有効なデータ移行依頼が指定されていません');
            }else{
                return result.get(0);
            }
        }catch (Exception e){
            String errorMessage = 'Time(Asia/Tokyo) : ' + Datetime.now().format('yyyy-MM-dd HH:mm:ss', 'Asia/Tokyo') + ' Message : ' + e.getMessage() + ' StackTrace : ' + e.getStackTraceString();
            // Logger.error(errorMessage);
            // Logger.saveLog();
            AuraHandledException ae = new AuraHandledException(errorMessage);
            ae.setMessage(errorMessage);
            throw ae;
        }
    }

    /**
     * @description
     * 申込詳細情報の削除フラグをTRUEにする
     * @param recordId 申込詳細情報レコード
     * @param lastModifiedDate 画面上の最終更新日時
     * @return 登録結果
     * @see dgkMoshikomiShosaiRecordDetail
     */
    @SuppressWarnings('PMD.CyclomaticComplexity')
    @AuraEnabled
    public static void deleteDataMigrationRequest( String recordId, Datetime lastModifiedDate) {
    // public static DataMigrationRequestResult deleteDataMigrationRequest( String recordId, Datetime lastModifiedDate) {
        // DataMigrationRequest__c result = new DataMigrationRequestResult();
        // List<String> errorMessages = new List<String>();

        // try{
        //     List<DataMigrationRequest__c> dataMigrationRequestRecord = [SELECT LastModifiedDate FROM DataMigrationRequest__c WHERE Id =: recordId];
        //     if(dataMigrationRequestRecord.isEmpty()){
        //         throw new DataMigrationRequestException('有効な申込詳細レコードIDが指定されていません');
        //     }

        //     if(dataMigrationRequestRecord.get(0).LastModifiedDate != lastModifiedDate){
        //         String errorMessaege = '他の作業者によりすでに更新されています。';
        //         errorMessages.add(errorMessaege);
        //         result.isSuccess = false;
        //         result.errorMessages = errorMessages;
        //         return result;
        //     }

        //     DataMigrationRequest__c request = new DataMigrationRequest__c(
        //         Id = recordId,
        //         DeleteCompFlag__c = true
        //     );

        //     update as system request;

        //     result.isSuccess = true;
        //     result.errorMessages = null;
        //     return result;

        // }catch (Exception e){
        //     String errorMessage = 'Time(Asia/Tokyo) : ' + Datetime.now().format('yyyy-MM-dd HH:mm:ss', 'Asia/Tokyo') + ' Message : ' + e.getMessage() + ' StackTrace : ' + e.getStackTraceString();
        //     Logger.error(errorMessage);
        //     Logger.saveLog();
        //     AuraHandledException ae = new AuraHandledException(errorMessage);
        //     ae.setMessage(errorMessage);
        //     throw ae;
        // }
    }

    /**
     * @description
     * 申込詳細登録画面における保存処理を行う
     * @param jsonData 入力申込詳細情報のJSON
     * @param isEdit 編集時はTRUE
     * @return 申込詳細情報の登録結果
     * @see dgkMohiskomiShosaiRecordCreateEdit
     */
    @AuraEnabled
    public static DataMigrationRequestResult upsertDataMigrationRequestSave(String jsonData, Boolean isEdit){
        Savepoint sp = Database.setSavepoint();
        DataMigrationRequestResult result = new DataMigrationRequestResult();
        return result;
        // try{
        //     DataMigrationRequestResult result = new DataMigrationRequestResult();
        //     DataMigrationRequest__c newRecord = (DataMigrationRequest__c)JSON.deserialize(jsonData, DataMigrationRequest__c.class);
        //     Map<String, Object> containFields = newRecord.getPopulatedFieldsAsMap();
        //     DataMigrationRequest__c oldRecord = null;
        //     if(isEdit){
        //         oldRecord = getOldRecord(newRecord);
        //     }

        //     //TokuyakuMeisho__c が入力されている場合、参照レコードを取得しNameに設定
        //     if (newRecord.TokuyakuMeisho__c != null) {
        //         Product2 tokuyaku = [
        //             SELECT Id, DGK_TokuyakuCode__c FROM Product2 WHERE Id = :newRecord.TokuyakuMeisho__c LIMIT 1
        //         ];
        //         if (tokuyaku.DGK_TokuyakuCode__c != null) {
        //             newRecord.Name = tokuyaku.DGK_TokuyakuCode__c;
        //         }
        //     }

        //     List<String> errorMessages = new List<String>();

        //     //入力チェック
        //     checkItemSave(newRecord, errorMessages, isEdit, oldRecord);
        //     if(errorMessages.size() > 0){
        //         result.isSuccess = false;
        //         result.errorMessages = errorMessages;
        //         return result;
        //     }

        //     // 編集時は排他チェックを実施
        //     checkExclusion(newRecord, errorMessages, isEdit);
        //     if(errorMessages.size()>0){
        //         result.isSuccess = false;
        //         result.errorMessages = errorMessages;
        //         return result;
        //     }

        //     upsert as system newRecord;
        //     result.moshikomiShosaiId = newRecord.Id;
        //     result.isSuccess = true;
        //     return result;

        // }catch (Exception e){
        //     Database.rollback(sp);
        //     String errorMessage = 'Time(Asia/Tokyo) : ' + Datetime.now().format('yyyy-MM-dd HH:mm:ss', 'Asia/Tokyo') + ' Message : ' + e.getMessage() + ' StackTrace : ' + e.getStackTraceString();
        //     // Logger.error(errorMessage);
        //     // Logger.saveLog();
        //     AuraHandledException ae = new AuraHandledException(errorMessage);
        //     ae.setMessage(errorMessage);
        //     throw ae;
        // }
    }

    /**
     * @description
     * 更新前の申込詳細情報を取得する
     * @param newRecord 処理対象申込詳細情報レコード
     * @return 申込詳細情報レコード
     */
    private static DataMigrationRequest__c getOldRecord(DataMigrationRequest__c newRecord){
        List<DataMigrationRequest__c> oldRecord = [SELECT 
                Id,
                // MoshikomiKihonJoho__c,
                // Name,
                // TokuyakuMeisho__c,
                // HaraikomiHoho__c,
                // Hokenryo__c,
                // LpsNenkanzanHokenryo__c,
                // DeleteCompFlag__c,
                CreatedById,
                LastModifiedById,
                CreatedDate,
                LastModifiedDate
            FROM DataMigrationRequest__c WHERE id =: newRecord.Id];
            // FROM DataMigrationRequest__c WHERE id =: newRecord.Id AND DeleteCompFlag__c=:false];
        // if(oldRecord.isEmpty()){
        //     throw new DataMigrationRequestException('更新前レコード情報が取得できません。');
        // }
        return oldRecord.get(0);
    }

    /**
     * @description
     * 申込詳細情報の入力チェックを行う
     * @param newRecord 入力された申込詳細情報
     * @param errorMessages 入力チェックで該当した際のエラーメッセージを格納（実質返り値）
     * @param isEdit 編集時はTRUE
     * @param oldRecord 変更前の申込詳細情報
     */
    @SuppressWarnings('PMD.ExcessiveParameterList, PMD.NcssMethodCount')
    private static void checkItemSave(DataMigrationRequest__c newRecord, List<String> errorMessages, Boolean isEdit, DataMigrationRequest__c oldRecord){
        // //更新対象となるフィールド情報を取得
        // Map<String, Object> containFields = newRecord.getPopulatedFieldsAsMap();
        // validateTokuyakuMeisho(newRecord,containFields,errorMessages);
        // validateHaraikomiHoho(newRecord,containFields,errorMessages);
        // validateMaxShosaiCount(newRecord,errorMessages,isEdit);
    }    

    /**
     * @description
     * 特約名称の入力チェック
     * @param newRecord 処理対象申込詳細レコード
     * @param containFields newRecordに含まれているフィールドの情報
     * @param errorMessages エラーメッセージ群
     */
    private static void validateTokuyakuMeisho(DataMigrationRequest__c newRecord, Map<String, Object> containFields, List<String> errorMessages){
        // if( !containFields.containsKey('TokuyakuMeisho__c')){
        //     return;
        // }
        // if (newRecord.TokuyakuMeisho__c == null) {
    	// 	errorMessages.add(DGK_KT_CMN_MessageUtil.getMessage(DGK_KT_CMN_MessageConstants.MSG_ID_DGKCME0053 , new List<String>{DataMigrationRequest__c.TokuyakuMeisho__c.getDescribe().getLabel()}));
        //     return;
    	// }
    }
    /**
     * @description
     * 払込方法の入力チェック
     * @param newRecord 処理対象申込詳細レコード
     * @param containFields newRecordに含まれているフィールドの情報
     * @param errorMessages エラーメッセージ群
     */
    private static void validateHaraikomiHoho(DataMigrationRequest__c newRecord, Map<String, Object> containFields, List<String> errorMessages){
        // if( !containFields.containsKey('HaraikomiHoho__c')){
        //     return;
        // }
        // if (DGK_KT_CMN_CheckUtil.checkNullStr(newRecord.HaraikomiHoho__c)) {
    	// 	errorMessages.add(DGK_KT_CMN_MessageUtil.getMessage(DGK_KT_CMN_MessageConstants.MSG_ID_DGKCME0049 , new List<String>{DataMigrationRequest__c.HaraikomiHoho__c.getDescribe().getLabel()}));
    	// }
    }

    /**
     * @description
     * 同一申込基本情報に紐づく未削除の申込詳細が10件以上ある場合はエラーとする
     * @param newRecord 処理対象申込詳細レコード
     * @param errorMessages エラーメッセージ群
     * @param isEdit 編集時はTRUE
     */
    private static void validateMaxShosaiCount(DataMigrationRequest__c newRecord, List<String> errorMessages, Boolean isEdit) {
        // // 編集時はバリデーションをスキップ
        // if (isEdit) {
        //     return;
        // }
    
        // if (newRecord.MoshikomiKihonJoho__c == null) {
        //     return;
        // }
    
        // List<AggregateResult> results = [
        //     SELECT COUNT(Id) total
        //     FROM DataMigrationRequest__c
        //     WHERE MoshikomiKihonJoho__c = :newRecord.MoshikomiKihonJoho__c
        //     AND DeleteCompFlag__c = false
        // ];
    
        // Integer count = (Integer)results[0].get('total');
    
        // if (count >= 10) {
        //     errorMessages.add(
        //         DGK_KT_CMN_MessageUtil.getMessage(
        //             DGK_KT_CMN_MessageConstants.MSG_ID_DGKSKE0065,
        //             new List<String>{}
        //         )
        //     );
        // }
    }

    /**
     * @description
     * 排他チェックを行う
     * @param newRecord 更新対象レコード
     * @param errorMessages エラーメッセージ群
     * @param isEdit 変数時はTRUE
     */
    private static void checkExclusion(DataMigrationRequest__c newRecord, List<String> errorMessages, Boolean isEdit){
        // //新規作成時はチェックしない
        // if(!isEdit){
        //     return;
        // }
        // List<DataMigrationRequest__c> oldRecord = [SELECT id, LastModifiedDate FROM DataMigrationRequest__c WHERE id =: newRecord.Id AND DeleteCompFlag__c=false FOR UPDATE];
        // if (oldRecord.size() == 0 || newRecord.LastmodifiedDate != oldRecord.get(0).LastmodifiedDate) {
        //     errorMessages.add(DGK_KT_CMN_MessageUtil.getMessage(DGK_KT_CMN_MessageConstants.MSG_ID_DGKCME0001, new List<String>{}));
        // }
    }
    
    /**
     * @description
     * LWC返却用のクラス。処理結果とエラーメッセージを保持
     */
    public class DataMigrationRequestResult{
        @AuraEnabled
        public Boolean isSuccess;
        //作成、更新したレコードID
        @AuraEnabled
        public String dataMigrationRequestId;
        @AuraEnabled
        public List<String> errorMessages;
    }

    /**
     * @description
     * LWC返却用のクラス。申込詳細情報新規作成時の
     */
    @SuppressWarnings('PMD.TooManyFields')
    public class CreateSetupData{
        // //申込基本情報Id
        @AuraEnabled
        public Id requestId;
        // //申込基本情報名
        // @AuraEnabled
        // public String kihonName;
        // //特約名称
        // @AuraEnabled
        // public String tokuyakuMeisho;
        // //払い込み方法
        // @AuraEnabled
        // public String haraikomiHoh;
        // //保険料
        // @AuraEnabled
        // public String hokenryo;
        // //LPS年払保険料（参考）
        // @AuraEnabled
        // public String lpsNenkanzanHokenryo;
    }
        
    /**
     * @description
     * 本クラスで発生させたいカスタムException
     */
    public class DataMigrationRequestException extends Exception {} 

    /**
     * @description
     * テスト用のExceptionクラス
     */
    public class TestException extends Exception{}

}