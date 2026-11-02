/**
 * 設計書トリガハンドラ2
 * 
 * @author ZRS名越 2025/12/dd
 * @version 1.2 GTR商品対応によるAnalytics案件検索の更新
 */
public with sharing class CKS_HDL_DesignAnalyticsOppSearch extends CKS_HDL_Base {
    // 保存前のレコード一覧
    public List<DesignDocument__c> oldList;
    // 保存後のレコード一覧
    public List<DesignDocument__c> newList;
    // 操作実施前のオブジェクトMap
    public Map<Id, DesignDocument__c> oldMap;
    // 操作実施後のオブジェクトMap
    public Map<Id, DesignDocument__c> newMap;
    //テスト時の例外発生検証用変数
	public static Boolean isTestForceError = false;
    
     /**
     * コンストラクタ。Trigger変数から操作前後のオブジェクト情報を渡す。
     * @param oldObjectList 保存前のレコード一覧
     * @param newObjectList 保存後のレコード一覧
     * @param oldObjectMap 操作実施前のオブジェクトMap
     * @param newObjectMap 操作実施後のオブジェクトMap
     **/
    public CKS_HDL_DesignAnalyticsOppSearch(
        List<SObject> oldObjectList,
        List<SObject> newObjectList,
        Map<Id, SObject> oldObjectMap,
        Map<Id, SObject> newObjectMap) {

        super(oldObjectList, newObjectList, oldObjectMap, newObjectMap);
        // IF管理者の実行フラグ:ON
        setIsIfAdmin();
        this.oldList = (List<DesignDocument__c>)oldObjectList;
        this.newList = (List<DesignDocument__c>)newObjectList;
        this.oldMap = (Map<Id, DesignDocument__c>)oldObjectMap;
        this.newMap = (Map<Id, DesignDocument__c>)newObjectMap;
    }
    
    /**
     * afterInsertトリガイベント
     */
    public override void onAfterInsert(){

        List<AnalyticsOpportunitySearch__c> aosl = new List<AnalyticsOpportunitySearch__c>();
        
        //手数料率設定用マップ
        Map<String,List<ProductCommissionPercent__c>> ProductMap=getProductMap(this.newList);
        //関連Analytics共通データセットのマップ
        Map<string,Map<string,string>> AnalyticsDatasetMap = getAnalyticsDataset(this.newList);
        //関連Analyticsデータセットの募集人名(無効ユーザ明示)
        Map<Id,AnalyticsDataset__c> DatasetAgentNameMap = getAnalyticsAgentName(this.newList);
        //関連顧客注意事項IDを取得
        Map<id,id> CustomerNotesMap = getCustomerNotesId(this.newList);

        List<DesignDocument__c> docList = getNewDocuments(this.newList);
        //Analyticsデータセットから部署コードを取得
        Map<string,string> DepartmentCodeMap = getAnalyticsDepartmentCode(docList);

        for (DesignDocument__c ddoc : docList) {

            AnalyticsOpportunitySearch__c aos = new AnalyticsOpportunitySearch__c();

            //設計書ID
            aos.DesignDocument__c=ddoc.Id;
            //団体名
            aos.DesignDocGroupName__c=ddoc.GroupNameForAnalytics__c;
            //団体コード
            aos.DesignDocGroupCode__c=ddoc.GroupCodeForAnalytics__c;
            //案件ID
            aos.Opportunity__c = ddoc.Opportunity__c;
            //Upsert用ユニークID(案件ID＋案件/保険契約ID)
            string oppId = ddoc.Opportunity__c;
            string DesignDocumentId = ddoc.Id;
            aos.UniqueIdForUpsert__c = oppId + DesignDocumentId;
            //担当者
            if(DatasetAgentNameMap.get(ddoc.Opportunity__r.OwnerId) != null){
                aos.Agent__c = DatasetAgentNameMap.get(ddoc.Opportunity__r.OwnerId).id;
            }
            //処理担当者
            if(DatasetAgentNameMap.get(ddoc.Opportunity__r.StaffInChargOperate__c) != null){
                aos.ProceedingStaff__c = DatasetAgentNameMap.get(ddoc.Opportunity__r.StaffInChargOperate__c).id;
            }
            //顧客注意事項
            if(CustomerNotesMap.get(ddoc.Opportunity__r.Accountid) != null){
                aos.CustomerNotes__c = CustomerNotesMap.get(ddoc.Opportunity__r.Accountid);
            }
             
            //足利不動産の場合のみ処理
            if(ddoc.Opportunity__r.owner.Contact.Account.AnalyticsIndividualCompanyHandling__c == '足利不動産株式会社'){
                //保険料区分
                aos.InsuranceFeeDivision__c = ddoc.Insurance_fee_division__r.DisplayName__c;
                //契約区分
                aos.ContractDivision__c = ddoc.Contract_division__r.DisplayName__c;
                //手続区分
                aos.ProcedureDivision__c = ddoc.Routine_division__r.DisplayName__c;
                //団体第2階層名(設計書)
                aos.DesignDocGroupSecondName__c = ddoc.GroupSecond__r.Name;
                //最終更新者
                if(DatasetAgentNameMap.get(ddoc.LastModifiedById) != null){
                    aos.LastModifiedBy__c = DatasetAgentNameMap.get(ddoc.LastModifiedById).AgentName_InactiveUserShowing__c;
                }
                //部署コード
                string DepartmentKey = ddoc.Opportunity__r.OwnerBranch__c + ddoc.Opportunity__r.OwnerDepartment__c;
                if(DepartmentCodeMap.get(DepartmentKey) != null){
                    aos.OwnerDepartmentCode__c = DepartmentCodeMap.get(DepartmentKey);
                }
                //関連Analytics共通データセットの処理
                if(!AnalyticsDatasetMap.isEmpty()){
                    //足利不動産商品領域
                    aos.AKFProductCategory__c = AnalyticsDatasetMap.get(processProductName(ddoc.ProductName__c)).get('AKFProductCategory__c');
                    //足利不動産商品領域順
                    aos.AKFProductCategoryOrder__c = AnalyticsDatasetMap.get(processProductName(ddoc.ProductName__c)).get('AKFProductCategoryOrder__c');
                }
            }

            //関連Analytics共通データセットの処理
            if(!AnalyticsDatasetMap.isEmpty()){
                //商品領域
                aos.ProductCategory__c = AnalyticsDatasetMap.get(processProductName(ddoc.ProductName__c)).get('ProductCategory__c');
                //商品領域順
                aos.ProductCategoryOrder__c = AnalyticsDatasetMap.get(processProductName(ddoc.ProductName__c)).get('ProductCategoryOrder__c');
            }

            //商品手数料率マスタの手数料率
            if(ProductMap!=null){
                String pmKey = keyWithConPlan(ddoc.Agency__c,processProductName(ddoc.ProductName__c),ddoc.SalesPlan__c,ddoc.ConditionalCancelDivisionForAnalytics__c);
                for(string pm : ProductMap.keyset()){
                    if(pm == pmkey){
                        for(ProductCommissionPercent__c pcp:ProductMap.get(pm)){
                            
                            //商品手数料率の適用開始日と適用終了日がすべて未入力の場合
                            if(pcp.CommissionStartDate__c == null && pcp.CommissionEndDate__c == null){
                                aos.ProductCommissionPercent__c=pcp.CommissionPercent__c;

                            //商品手数料率の適用開始日のみ未入力の場合
                            }else if(pcp.CommissionStartDate__c == null && pcp.CommissionEndDate__c != null){

                                if(ddoc.CommissionRateApplicabilityJudgmentDate__c <= pcp.CommissionEndDate__c){
                                    aos.ProductCommissionPercent__c=pcp.CommissionPercent__c;
                                }

                            //商品手数料率の適用終了日のみ未入力の場合
                            }else if(pcp.CommissionStartDate__c != null && pcp.CommissionEndDate__c == null){

                                if(ddoc.CommissionRateApplicabilityJudgmentDate__c >= pcp.CommissionStartDate__c){
                                    aos.ProductCommissionPercent__c=pcp.CommissionPercent__c;
                                }

                            //商品手数料率の適用開始日と適用終了日がすべて入力された場合
                            }else{

                                if(ddoc.CommissionRateApplicabilityJudgmentDate__c <= pcp.CommissionEndDate__c&&ddoc.CommissionRateApplicabilityJudgmentDate__c >= pcp.CommissionStartDate__c){
                                    aos.ProductCommissionPercent__c=pcp.CommissionPercent__c;
                                }
                            }  
                        }
                    }
                }
            }

            aosl.add(aos);
        }
        
        if (aosl.size() > 0) {
            
            try {
                if (Test.isRunningTest() && isTestForceError) {
				    throw new AuraHandledException('テスト用強制エラー');
			    }
                
                insert aosl;
            }catch (Exception e){
                System.debug('案件検索Error_設計書_Insert: ' + e.getMessage());
                sendErrorEmail(e.getMessage(),this.newList);
            }
        }
    }

    /**
     * after updateの処理を実行する。
     * @param None 引数なし
     * @return 返り値なし
     **/
    public override void onAfterUpdate() {

        List<AnalyticsOpportunitySearch__c> aosUpdateList = new List<AnalyticsOpportunitySearch__c>();
        List<DesignDocument__c> updateDocList = getNewDocuments(this.newList);
        
        Map<id,List<AnalyticsOpportunitySearch__c>> updateMap = createAosMap(updateDocList);
        
        Map<String,List<ProductCommissionPercent__c>> updateProductMap=getProductMap(this.newList);
        
        //関連Analyticsデータセット
        Map<Id,AnalyticsDataset__c> DatasetAgentNameMapUpdate = getAnalyticsAgentName(this.newList);
        //関連Analytics共通データセットのマップ
        Map<string,Map<string,string>> AnalyticsDatasetMapUpdate = getAnalyticsDataset(this.newList);

        if(updateMap.size() > 0){

            for(DesignDocument__c doc:updateDocList){
                
                DesignDocument__c oldDoc = this.oldMap.get(doc.Id);

                for(AnalyticsOpportunitySearch__c aos:updateMap.get(doc.id)){

                    //商品手数料を先にNullをする
                    aos.ProductCommissionPercent__c = null;
                    if(oldDoc.Group__c != doc.Group__c){
                        //団体名
                        aos.DesignDocGroupName__c = doc.GroupNameForAnalytics__c;
                        //団体コード
                        aos.DesignDocGroupCode__c = doc.GroupCodeForAnalytics__c;
                    }
                    //関連Analyticsデータセットの処理
                    if(!AnalyticsDatasetMapUpdate.isEmpty() && processProductName(oldDoc.ProductName__c) != processProductName(doc.ProductName__c)){
                        //商品領域
                        aos.ProductCategory__c = AnalyticsDatasetMapUpdate.get(processProductName(doc.ProductName__c)).get('ProductCategory__c');
                        //商品領域順
                        aos.ProductCategoryOrder__c = AnalyticsDatasetMapUpdate.get(processProductName(doc.ProductName__c)).get('ProductCategoryOrder__c');
                    }
                    //担当者
                    if(DatasetAgentNameMapUpdate.get(doc.Opportunity__r.OwnerId) != null &&
                       DatasetAgentNameMapUpdate.get(doc.Opportunity__r.OwnerId) != DatasetAgentNameMapUpdate.get(oldDoc.Opportunity__r.OwnerId)){
                        aos.Agent__c = DatasetAgentNameMapUpdate.get(doc.Opportunity__r.OwnerId).id;
                    }
                    //処理担当者
                    if(DatasetAgentNameMapUpdate.get(doc.Opportunity__r.StaffInChargOperate__c) != null &&
                       DatasetAgentNameMapUpdate.get(doc.Opportunity__r.StaffInChargOperate__c) != DatasetAgentNameMapUpdate.get(oldDoc.Opportunity__r.StaffInChargOperate__c)){
                        aos.ProceedingStaff__c = DatasetAgentNameMapUpdate.get(doc.Opportunity__r.StaffInChargOperate__c).id;
                    }
                    //商品手数料率マスタの手数料率
                    if(updateProductMap!=null){
                
                    String pmKey = keyWithConPlan(doc.Agency__c,processProductName(doc.ProductName__c),doc.SalesPlan__c,doc.ConditionalCancelDivisionForAnalytics__c);
                        
                        for(string pm : updateProductMap.keyset()){

                            if(pm == pmkey){
                                
                                for(ProductCommissionPercent__c pcp:updateProductMap.get(pm)){
                                    
                                    //商品手数料率の適用開始日と適用終了日がすべて未入力の場合
                                    if(pcp.CommissionStartDate__c == null && pcp.CommissionEndDate__c == null){
                                        aos.ProductCommissionPercent__c=pcp.CommissionPercent__c;
        
                                    //商品手数料率の適用開始日のみ未入力の場合
                                    }else if(pcp.CommissionStartDate__c == null && pcp.CommissionEndDate__c != null){
        
                                        if(doc.CommissionRateApplicabilityJudgmentDate__c <= pcp.CommissionEndDate__c){
                                            aos.ProductCommissionPercent__c=pcp.CommissionPercent__c;
                                        }
        
                                    //商品手数料率の適用終了日のみ未入力の場合
                                    }else if(pcp.CommissionStartDate__c != null && pcp.CommissionEndDate__c == null){
        
                                        if(doc.CommissionRateApplicabilityJudgmentDate__c >= pcp.CommissionStartDate__c){
                                            aos.ProductCommissionPercent__c=pcp.CommissionPercent__c;
                                        }
        
                                    //商品手数料率の適用開始日と適用終了日がすべて入力された場合
                                    }else{
        
                                        if(doc.CommissionRateApplicabilityJudgmentDate__c <= pcp.CommissionEndDate__c&&doc.CommissionRateApplicabilityJudgmentDate__c >= pcp.CommissionStartDate__c){
                                            aos.ProductCommissionPercent__c=pcp.CommissionPercent__c;
                                        }
                                    }  
                                }
                            }
                        }
                    }

                    //足利不動産の場合のみ処理
                    if(oldDoc.Opportunity__r.ownerId != doc.Opportunity__r.ownerId &&
                        doc.Opportunity__r.owner.Contact.Account.AnalyticsIndividualCompanyHandling__c == '足利不動産株式会社'){
                        //保険料区分
                        if(oldDoc.Insurance_fee_division__r.DisplayName__c != doc.Insurance_fee_division__r.DisplayName__c){
                            aos.InsuranceFeeDivision__c = doc.Insurance_fee_division__r.DisplayName__c;
                        }
                        //契約区分
                        if(oldDoc.Contract_division__r.DisplayName__c != doc.Contract_division__r.DisplayName__c){
                            aos.ContractDivision__c = doc.Contract_division__r.DisplayName__c;
                        }
                        //手続区分
                        if(oldDoc.Routine_division__r.DisplayName__c != doc.Routine_division__r.DisplayName__c){
                            aos.ProcedureDivision__c = doc.Routine_division__r.DisplayName__c;
                        }
                        //団体第2階層名(設計書)
                        if(oldDoc.GroupSecond__c != doc.GroupSecond__c){
                            aos.DesignDocGroupSecondName__c = doc.GroupSecond__r.Name;
                        }
                        //最終更新者
                        if(DatasetAgentNameMapUpdate.get(doc.LastModifiedById) != null &&
                           DatasetAgentNameMapUpdate.get(doc.LastModifiedById) != DatasetAgentNameMapUpdate.get(oldDoc.LastModifiedById)){
                            aos.LastModifiedBy__c = DatasetAgentNameMapUpdate.get(doc.LastModifiedById).AgentName_InactiveUserShowing__c;
                        }
                        //関連Analyticsデータセットの処理
                        if(!AnalyticsDatasetMapUpdate.isEmpty()){
                            //足利不動産商品領域
                            aos.AKFProductCategory__c = AnalyticsDatasetMapUpdate.get(processProductName(doc.ProductName__c)).get('AKFProductCategory__c');
                            //足利不動産商品領域順
                            aos.AKFProductCategoryOrder__c = AnalyticsDatasetMapUpdate.get(processProductName(doc.ProductName__c)).get('AKFProductCategoryOrder__c');
                        }
                    }
                    aosUpdateList.add(aos);
                }
            }
        }
        if(aosUpdateList.size()>0){
            
            try {
                if (Test.isRunningTest() && isTestForceError) {
				    throw new AuraHandledException('テスト用強制エラー');
			    }

                update aosUpdateList;
            }catch (Exception e){
                System.debug('案件検索Error_設計書_Update: ' + e.getMessage());
                sendErrorEmail(e.getMessage(),this.newList);
            }
        }
    }

    //設計書データと関連の手数料率を取得
    private Map<string,List<ProductCommissionPercent__c>> getProductMap(List<DesignDocument__c> designList){

        Map<string,List<ProductCommissionPercent__c>> productMap = new Map<string,List<ProductCommissionPercent__c>>();
        List<Id> AngecyList = new List<Id>();
        List<ProductCommissionPercent__c> ProductCommissionList=new List<ProductCommissionPercent__c>();
        Map<String,Decimal> productCommissionPercentResult =new Map<String,Decimal>();

        for (DesignDocument__c ddoc : designList){
            AngecyList.add(ddoc.Agency__c);
        }
        
        if(AngecyList.size()>0){
            ProductCommissionList =[select Id,AssociateName__c,ProductName__c,SalesPlan__c,ConditionalCancelDivisionForAnalytics__c,CommissionPercent__c,CommissionStartDate__c,CommissionEndDate__c,LastModifiedDate FROM ProductCommissionPercent__c where AssociateName__c in :AngecyList order by LastModifiedDate];
        }
        
        if(ProductCommissionList.size()>0){
            for(ProductCommissionPercent__c pcp : ProductCommissionList){

                String mapKey = keyWithConPlan(String.valueOf(pcp.AssociateName__c).left(15), processProductName(pcp.ProductName__c), pcp.SalesPlan__c, pcp.ConditionalCancelDivisionForAnalytics__c);
                
                if(!productMap.containsKey(mapKey)){
                    productMap.put(mapKey,new List<ProductCommissionPercent__c>());
                }
                productMap.get(mapKey).add(pcp);
            }

            return productMap;
        }else{
            return null;
        }
    }

    //設計書データと関連するAnalytics共通データセットの商品領域と商品領域順を取得
    private Map<string,Map<string,string>> getAnalyticsDataset(List<DesignDocument__c> designList){

        //提案商品(主契約)リスト
        List<string> productNameList = new List<string>();
        //Analytics共通データセットリスト
        List<AnalyticsCommonDataset__c> analyticsDatasetList = new List<AnalyticsCommonDataset__c>();
        //return resultマップ
        Map<string,Map<string,string>> resultanalyticsDataset = new Map<string,Map<string,string>>();

        for(DesignDocument__c dd:designList){
            productNameList.add(processProductName(dd.ProductName__c));
        }

        if(productNameList.size()>0){
            analyticsDatasetList = [SELECT id,
                                           RecordType.DeveloperName,
                                           DesignDocument_ProductName__c,
                                           ProductCategory__c,
                                           ProductCategoryOrder__c,
                                           AKFProductCategory__c,
                                           DesignDocument_ProductName_TrimSpaces__c,
                                           AKFProductCategoryOrder__c 
                                           FROM AnalyticsCommonDataset__c 
                                           WHERE RecordType.DeveloperName = 'ProductMaster' AND DesignDocument_ProductName_TrimSpaces__c in: productNameList];
        }
        
        if(analyticsDatasetList.size()>0){

            for(AnalyticsCommonDataset__c ad:analyticsDatasetList){

                Map<string,string> adMap = new Map<string,string>();
                resultanalyticsDataset.put(ad.DesignDocument_ProductName_TrimSpaces__c,adMap);
                
                //Analyticsデータセットの商品領域の値をセット
                adMap.put('ProductCategory__c',ad.ProductCategory__c);
                //Analyticsデータセットの商品領域順の値をセット
                adMap.put('ProductCategoryOrder__c',ad.ProductCategoryOrder__c);
                //Analyticsデータセットの足利不動産商品領域の値をセット
                adMap.put('AKFProductCategory__c',ad.AKFProductCategory__c);
                //Analyticsデータセットの足利不動産商品領域順の値をセット
                adMap.put('AKFProductCategoryOrder__c',ad.AKFProductCategoryOrder__c);
            }
        }

        return resultanalyticsDataset;
    }

    //設計書関連のAnalyticsデータセットを取得
    private Map<id,AnalyticsDataset__c> getAnalyticsAgentName(List<DesignDocument__c> ddList){

        //設計書の最終更新者のIDリスト
        List<Id> LastModifiedById = new List<Id>();
        //案件所有者のIDリスト
        List<Id> oppOwnerId = new List<Id>();
        //案件処理担当者のIDリスト
        List<Id> StaffInChargOperateId = new List<Id>();
        //Analyticsデータセットリスト
        List<AnalyticsDataset__c> analyticsDataes = new List<AnalyticsDataset__c>();
        //return resultマップ
        Map<id,AnalyticsDataset__c> resultAgentNameMap = new Map<id,AnalyticsDataset__c>();
        //案件所有者の所属代理店コードリスト
        List<string> AssociateCodeList = new List<string>();

        List<DesignDocument__c> docsList = getNewDocuments(ddList);

        for(DesignDocument__c dnd : docsList){
            LastModifiedById.add(dnd.LastModifiedById);
            oppOwnerId.add(dnd.Opportunity__r.OwnerId);
            StaffInChargOperateId.add(dnd.Opportunity__r.StaffInChargOperate__c);

            AssociateCodeList.add(dnd.Opportunity__r.AssociateCode__c);
        }

        IF(LastModifiedById.size() > 0){

            analyticsDataes = [SELECT id,
                                      UserId__c,
                                      AgentName_InactiveUserShowing__c 
                                      FROM AnalyticsDataset__c 
                                      WHERE RecordType.DeveloperName = 'UserInfo'
                                      AND AS_Code__c IN:AssociateCodeList 
                                      AND UserId__c != null
                                      AND (UserId__c IN:LastModifiedById 
                                        OR UserId__c IN:oppOwnerId 
                                        OR UserId__c IN:StaffInChargOperateId)];
        }

        IF(analyticsDataes.size() > 0){
            for(AnalyticsDataset__c ad : analyticsDataes){
                resultAgentNameMap.put(ad.UserId__c,ad);
            }
        }

        return resultAgentNameMap;
    }

    //関連顧客注意事項を取得する
    private Map<Id,Id> getCustomerNotesId(List<DesignDocument__c> ddList){

        List<DesignDocument__c> ddDatas = [SELECT id,Opportunity__r.AccountId,Opportunity__r.Owner.Contact.Account.AssociateCode__c FROM DesignDocument__c WHERE id IN:ddList];
        //案件所有者の代理店コードのリスト
        List<String> AssociateCodeList = new List<String>();
        //関連顧客のIDリスト
        List<id> accIdList = new List<id>();
        //案件と関連する取引先リスト
        List<Account> AccList = new List<account>();
        //result顧客注意事項IDマップ
        Map<Id,Id> resultNotesIdMap = new Map<Id,Id>();

        for(DesignDocument__c dd:ddDatas){
            accIdList.add(dd.Opportunity__r.AccountId);
            AssociateCodeList.add(dd.Opportunity__r.Owner.Contact.Account.AssociateCode__c);
        }
        
        if(AssociateCodeList.size()>0){

            AccList = [SELECT id,
                              name,
                              (SELECT id,
                                      PersonAccount__c,
                                      AssociateCodeForReport__c 
                                      FROM CustomerNotes__r 
                                      WHERE AssociateCodeForReport__c IN:AssociateCodeList 
                                      ORDER BY CreatedDate DESC LIMIT 1)
                              FROM Account 
                              WHERE id IN:accIdList AND (RecordType.DeveloperName = 'Individual' OR RecordType.DeveloperName = 'ExistingContract')
                       ];
        }
        
        if(AccList.size()>0){

            for(Account acc:AccList){
                if(!acc.CustomerNotes__r.isEmpty()){
                    resultNotesIdMap.put(acc.id,acc.CustomerNotes__r[0].id);
                }
            }
        }
        
        return resultNotesIdMap; 
    }

    //更新案件の関連Analytics案件検索Map作成
    private Map<id,List<AnalyticsOpportunitySearch__c>> createAosMap(List<DesignDocument__c> docList){
        
        List<AnalyticsOpportunitySearch__c> aosListUpdate = new List<AnalyticsOpportunitySearch__c>();
        Map<id,List<AnalyticsOpportunitySearch__c>> resultAosMap = new Map<id,List<AnalyticsOpportunitySearch__c>>();

        //案件所有者の所属代理店コードリスト
        List<string> AssociateCodeList = new List<string>();
        for(DesignDocument__c doc:docList){
            AssociateCodeList.add(doc.Opportunity__r.AssociateCode__c);
        }
        
        aosListUpdate = [SELECT id,
                                Opportunity__c,
                                DesignDocument__c,
                                CustomerNotes__c,
                                DesignDocGroupName__c,
                                DesignDocGroupCode__c,
                                ProductCategory__c,
                                ProductCategoryOrder__c,
                                AKFProductCategory__c,
                                AKFProductCategoryOrder__c,
                                InsuranceFeeDivision__c,
                                ContractDivision__c,
                                ProcedureDivision__c,
                                DesignDocGroupSecondName__c,
                                LastModifiedBy__c,
                                ProductCommissionPercent__c
                                FROM AnalyticsOpportunitySearch__c 
                                WHERE DesignDocument__c IN: docList 
                                AND Opportunity__r.AssociateCode__c IN: AssociateCodeList
                                ];

        if(aosListUpdate.size()>0){

            for(AnalyticsOpportunitySearch__c aos:aosListUpdate){

                if(!resultAosMap.containsKey(aos.DesignDocument__c)){
                    resultAosMap.put(aos.DesignDocument__c,new List<AnalyticsOpportunitySearch__c>());
                }
                resultAosMap.get(aos.DesignDocument__c).add(aos);
            }
        }

        return resultAosMap;
    }

    //Analyticsデータセットから部門コードを取得
    private Map<string,string> getAnalyticsDepartmentCode(List<DesignDocument__c> deList){

        //出先IDリスト
        List<string> AS_Branch_CodeList = new List<string>();
        //部署名リスト
        List<string> DepartmentNameList = new List<string>();
        //resultマップ(キー：出先ID＋部署名、値：部署コード)
        Map<string,string> DepartmentCodeMap = new Map<string,string>();

        for(DesignDocument__c de:deList){
            
            AS_Branch_CodeList.add(de.Opportunity__r.OwnerBranch__c);
            DepartmentNameList.add(de.Opportunity__r.OwnerDepartment__c); 
        }

        List<AnalyticsDataset__c> AnalyticsDatasetList = [SELECT id,
                                                                 DepartmentName__c,
                                                                 DepartmentCode__c,
                                                                 AS_Branch_AccountId__c,
                                                                 AS_Code__c,
                                                                 AS_Branch_Code_triple_digit__c 
                                                                 FROM AnalyticsDataset__c 
                                                                 WHERE recordtype.developerName = 'DepartmentInfo'  
                                                                 AND AS_Branch_AccountId__c IN: AS_Branch_CodeList 
                                                                 AND DepartmentName__c IN:DepartmentNameList];

        for(AnalyticsDataset__c ad:AnalyticsDatasetList){
            
            DepartmentCodeMap.put(ad.AS_Branch_AccountId__c+ad.DepartmentName__c,ad.DepartmentCode__c);
        }

        return DepartmentCodeMap;
    }

    private List<DesignDocument__c> getNewDocuments(List<DesignDocument__c> ddList){

        return [
                     SELECT id,
                            name,
                            Opportunity__r.name,
                            Opportunity__r.Accountid,
                            Opportunity__r.OwnerId,
                            Opportunity__r.AssociateCode__c,
                            Opportunity__r.OwnerBranch__c,
                            Opportunity__r.OwnerDepartment__c,
                            Opportunity__r.StaffInChargOperate__c,
                            Opportunity__r.OwnerFullName__c,
                            Opportunity__r.owner.Contact.Account.AnalyticsIndividualCompanyHandling__c,
                            Agency__c,
                            ProductName__c,
                            SalesPlan__c,
                            Group__c,
                            GroupNameForAnalytics__c,
                            GroupCodeForAnalytics__c,
                            ConditionalCancelDivisionForAnalytics__c,
                            CommissionRateApplicabilityJudgmentDate__c,
                            Insurance_fee_division__r.DisplayName__c,
                            Contract_division__r.DisplayName__c,
                            Routine_division__r.DisplayName__c,
                            LastModifiedByProfileNameForAnalytics__c,
                            GroupSecond__r.Name,
                            LastModifiedById,
                            (SELECT id,
                                    Name,
                                    DivideChargePerson__c,
                                    DivideChargeAmount__c,
                                    DivideChargeRate__c,
                                    Category__c,
                                    DisplayOrder__c
                                    FROM DesignDocuments__r
                                    ORDER BY DisplayOrder__c)
                            FROM DesignDocument__c 
                            WHERE id IN:ddList
                ];
    }

    //エラー発生する場合のメール送信
    public static void sendErrorEmail(String errorMessage,List<DesignDocument__c> docList){

        //送信元メール
        Id senderEmailId = [SELECT id,Address,DisplayName FROM OrgWideEmailAddress WHERE Address = 'mlt_xanet@aflac.co.jp' LIMIT 1].id;

        //本番環境かSandbox環境かを識別
        Boolean sandboxFlag = [SELECT Id,IsSandBox FROM Organization LIMIT 1].IsSandBox;
        String emailAddress;
        if(sandboxFlag){
            emailAddress = 'zrs_wei_l@aflac.co.jp';
        }else{
            emailAddress = 'mlt_camps_recipe@aflac.co.jp';
        }

        DesignDocument__c getDocOppOwner = [SELECT id,
                                                   Opportunity__c,
                                                   Opportunity__r.OwnerId,
                                                   Opportunity__r.OwnerFullName__c 
                                                   FROM DesignDocument__c 
                                                   WHERE id IN:docList 
                                                   LIMIT 1];

        Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage(); 
        mail.setToAddresses(new String[] {emailAddress});
        mail.setSubject('【CAMPS】案件検索データ作成でエラーが発生しました。');
        mail.setOrgWideEmailAddressId(senderEmailId);
        mail.setPlainTextBody(
                '以下の処理中にエラーが発生しました。'
                + '\n実行ユーザID：'+ UserInfo.getUserId()
                + '\n実行ユーザ名：'+ UserInfo.getName()
                + '\n実行時間：'+ String.valueof(Datetime.now())
                + '\n案件所有者ID(1件目)：'+ getDocOppOwner.Opportunity__r.OwnerId
                + '\n案件所有者名(1件目)：'+ getDocOppOwner.Opportunity__r.OwnerFullName__c
                + '\n案件ID(1件目)：'+ getDocOppOwner.Opportunity__c
                + '\n設計書ID(1件目)：'+ getDocOppOwner.Id
                + '\n処理設計書数：'+ docList.size()
                + '\n\nクラス名：CKS_HDL_DesignAnalyticsOppSearch'
                + '\nエラー詳細：' + errorMessage
            );

        Messaging.SendEmailResult[] results=Messaging.sendEmail(new Messaging.SingleEmailMessage[] { mail });
    }

    private String processProductName(String productName){

        //商品名の\u00A0の部分を削除
        productName = productName.remove('\u00A0');
        //商品名の空白を削除
        string finalProductName = productName.deleteWhitespace();

        return finalProductName;
    }

    //手数料率及び商品のkeyを作成するメソッド
    private String keyWithConPlan(String keyAgency,String keyProductName,String keySalesPlan,String keyConditionalCancelDivisionForAnalytics){
        //GTR対象商品の名称を取得
        final List<CKS_ALaCarte__mdt> alaCarteList = [Select MasterLabel From CKS_ALaCarte__mdt];
        
        boolean isContainsALC = false;
        //GTR対象商品であるか判別
        for (CKS_ALaCarte__mdt alc : alaCarteList){
            if(keyProductName.contains(alc.MasterLabel)){
                isContainsALC = true;
            }
        }
        //GTR対象商品である場合のみプラン名をkeyに反映
        if(isContainsALC){
            return keyAgency+keyProductName+keySalesPlan+keyConditionalCancelDivisionForAnalytics;
        }else{
            return keyAgency+keyProductName+keyConditionalCancelDivisionForAnalytics;
        }
    }
}