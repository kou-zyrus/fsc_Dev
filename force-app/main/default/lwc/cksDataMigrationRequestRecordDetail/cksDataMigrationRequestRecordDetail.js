/**
 * @description
 * CAMPSのデータ移行依頼のレコード詳細情報表示用コンポーネント
*/
import { LightningElement, wire, api } from 'lwc';
import { getRecord } from 'lightning/uiRecordApi';
import LightningConfirm from "lightning/confirm";
import { refreshApex } from '@salesforce/apex';
import workspaceAPI from 'lightning/platformWorkspaceApi';

// import cksDataMigrationRequestRecordCreateEdit from 'c/cksDataMigrationRequestRecordCreateEdit';

import ID_FIELD from '@salesforce/schema/DataMigrationRequest__c.Id';

import IMAGES from '@salesforce/resourceUrl/DataMigrationRequestImages';

import getEditSetupData from '@salesforce/apex/CKS_CTRL_DataMigrationRequest.getEditSetupData';
import deleteDataMigrationRequest from '@salesforce/apex/CKS_CTRL_DataMigrationRequest.deleteDataMigrationRequest';

/** 削除確認メッセージ */
const DELETE_CONFIRM_MESSAGE = {
    label: '削除確認',
    message: 'レコードを削除します。よろしいですか？', 
    theme: 'default', // 省略可能
    variant: 'header' // デフォルトはheader。
};

/** 移行種別の定数 */
const TYPE_NEW_USE = '販管から新規利用';
const TYPE_INTEGRATION_USED = '代理店統合(利用済み代理店間)';
const TYPE_INTEGRATION_UNUSED = '代理店統合(未利用代理店→利用済み代理店)';
const TYPE_ALLDATA_EXPORT = '全データ抽出';
const TYPE_SPECIFICDATA_EXPORT = '一部データ抽出';
const TYPE_TOA_BULKPATCH = 'トーア一括パッチ';
const TYPE_OTHER_PATCH = 'その他データパッチ';

/** 参考資料の表示定義 */
const REFERENCE_MATERIALS_CONFIG = {
    [TYPE_INTEGRATION_USED]: [
        {
            title: '2026年3月実施_ABC開発→J&S移行要件',
            url: 'https://aflacjpn.box.com/s/1t5rc3z65d9u1uxphxerd8jk0jogxsi3'
        }
    ]
};

/** 
 * 各項目の表示条件定義
 */
const FIELD_VISIBILITY = {
    migrationAssociateCode: [TYPE_INTEGRATION_USED, TYPE_INTEGRATION_UNUSED],
    existingContractCustomerNotes: [TYPE_NEW_USE, TYPE_INTEGRATION_USED, TYPE_INTEGRATION_UNUSED, TYPE_SPECIFICDATA_EXPORT, TYPE_TOA_BULKPATCH, TYPE_OTHER_PATCH],
    individual: [TYPE_NEW_USE, TYPE_INTEGRATION_USED, TYPE_INTEGRATION_UNUSED, TYPE_SPECIFICDATA_EXPORT, TYPE_OTHER_PATCH],
    childGroup: [TYPE_NEW_USE, TYPE_INTEGRATION_USED, TYPE_INTEGRATION_UNUSED, TYPE_SPECIFICDATA_EXPORT, TYPE_OTHER_PATCH],
    household: [TYPE_NEW_USE, TYPE_INTEGRATION_USED, TYPE_INTEGRATION_UNUSED, TYPE_SPECIFICDATA_EXPORT, TYPE_OTHER_PATCH],
    relative: [TYPE_INTEGRATION_USED, TYPE_SPECIFICDATA_EXPORT, TYPE_OTHER_PATCH],
    campaign: [TYPE_INTEGRATION_USED, TYPE_SPECIFICDATA_EXPORT, TYPE_OTHER_PATCH],
    campaignMember: [TYPE_INTEGRATION_USED, TYPE_SPECIFICDATA_EXPORT, TYPE_OTHER_PATCH],
    otherCompany: [TYPE_NEW_USE, TYPE_INTEGRATION_USED, TYPE_INTEGRATION_UNUSED, TYPE_SPECIFICDATA_EXPORT, TYPE_OTHER_PATCH],
    riderOtherCompany: [TYPE_INTEGRATION_USED, TYPE_SPECIFICDATA_EXPORT, TYPE_OTHER_PATCH],
    opportunity: [TYPE_INTEGRATION_USED, TYPE_SPECIFICDATA_EXPORT, TYPE_OTHER_PATCH],
    graspIntention: [TYPE_INTEGRATION_USED, TYPE_SPECIFICDATA_EXPORT, TYPE_OTHER_PATCH],
    personalInformationHandling: [TYPE_INTEGRATION_USED, TYPE_SPECIFICDATA_EXPORT, TYPE_OTHER_PATCH],
    dailyReport: [TYPE_INTEGRATION_USED, TYPE_SPECIFICDATA_EXPORT, TYPE_OTHER_PATCH],
    event: [TYPE_NEW_USE, TYPE_INTEGRATION_USED, TYPE_INTEGRATION_UNUSED, TYPE_SPECIFICDATA_EXPORT, TYPE_OTHER_PATCH],
    task: [TYPE_INTEGRATION_USED, TYPE_SPECIFICDATA_EXPORT, TYPE_OTHER_PATCH],
    attachmentDoc: [TYPE_INTEGRATION_USED, TYPE_SPECIFICDATA_EXPORT, TYPE_OTHER_PATCH],
    targetManagement: [TYPE_INTEGRATION_USED, TYPE_SPECIFICDATA_EXPORT, TYPE_OTHER_PATCH],
};

/** 移行対象オブジェクトごとのメッセージ定義 */
const MESSAGES_CONFIG = {
    individual: {
        base: {
            true: false,
            false: '白地顧客を移行しない場合、白地顧客に紐づく対応・案件等の関連データも移行されません。'
        },
        conditions: [
            {
                condition: (component) => !component.individual && component.otherCompany,
                text: '【他社証券データについて】移行元において被保険者として白地顧客が設定されていると、白地顧客が移行されない場合に該当の他社証券データの編集時にエラーが発生するため、該当する他社証券データの被保険者項目はブランクにします。',
                img: IMAGES + '/indivisualOtherCompany.png'
            }
        ]
    },
    childGroup: {
        base: {
            true: false,
            false: '顧客の「団体」「団体第2階層」「団体第3階層」に移行元の白地団体が設定されていると画面からの顧客情報の編集や手動名寄せにおいてエラーとなるため、移行対象顧客の該当項目に移行元の白地団体が設定されていた場合はブランクにします。',
            falseImg: IMAGES + '/childGroup.png'
        },
        conditions: []
    }
    // 必要に応じて他の項目も追加
};

export default class cksDataMigrationRequestRecordDetail extends LightningElement {
        /********************* 公開プロパティ *********************/
    //申込詳細情報レコードID
    @api recordId;

    /********************* 汎用制御用プロパティ *********************/
    //ロード中制御
    isLoading = false;
    //内部用の表示セクション
    internalActiveSections = ['A','R','B','C'];
    //Lightning Data Serviceのキャッシュクリア用の変数
    wiredResult;
    //二度押し防止用
    get disabled(){ return this.isLoading};
    
    /********************* 情報の格納 *********************/
    //エラー情報の格納
    error;
    //入力チェックエラーメッセージの格納
    errorMessages;
    //データ移行依頼名
    name;
    //移行種別
    migrationType;
    //移行日
    migrationDate;
    //対象代理店コード(7桁)
    associateCode;
    //移管元代理店コード(７桁)
    migrationAssociateCode;
    //既契約者の顧客注意事項
    existingContractCustomerNotes
    //白地顧客及び白地顧客の顧客注意事項
    individual;
    //白地団体及び白地団体の顧客注意事項
    childGroup;
    //世帯
    household;
    //関係者情報
    relative;
    //募集企画
    campaign;
    //募集企画対象者
    campaignMember;
    //他社保険契約
    otherCompany;
    //他社特約
    riderOtherCompany;
    //案件
    opportunity;
    //意向把握
    graspIntention;
    //個人情報取り扱い
    personalInformationHandling;
    //日報
    dailyReport;
    //対応
    event;
    //タスク
    task;
    //添付書類
    attachmentDoc;
    //目標
    targetManagement;
    //最終更新日
    lastModifiedDate;

    /********************* 全体の表示制御 *********************/
    get displayAll(){
        return !this.deleteCompFlag;
    }
    /********************* セクションの表示制御 *********************/
    //LightningServiceのリロード用キャッシュ
    @wire(getRecord, { recordId: '$recordId', fields: [ID_FIELD]})
    wiredFunc(result) {
        this.wiredResult = result;
    }

    //読み込み時処理
    connectedCallback(){
        this.init();
    }

    //初期化処理
    async init(){
        try{
            const requestData = await getEditSetupData({recordId : this.recordId});
            this.name = requestData.Name;
            this.migrationType = requestData.MigrationType__c;
            this.migrationDate = requestData.MigrationDate__c;
            this.associateCode = requestData.AssociateCode__c;
            this.migrationAssociateCode = requestData.MigrationAssociateCode__c;
            this.existingContractCustomerNotes = requestData.ExistingContractCustomerNotes__c;
            this.individual = requestData.Individual__c;
            this.childGroup = requestData.ChildGroup__c;
            this.household = requestData.Household__c;
            this.relative = requestData.Relative__c;
            this.campaign = requestData.Campaign__c;
            this.campaignMember = requestData.CampaignMember__c;
            this.otherCompany = requestData.OtherCompany__c;
            this.riderOtherCompany = requestData.RiderOtherCompany__c;
            this.opportunity = requestData.Opportunity__c;
            this.graspIntention = requestData.GraspIntention__c;
            this.personalInformationHandling = requestData.PersonalInformationHandling__c;
            this.dailyReport = requestData.DailyReport__c;
            this.event = requestData.Event__c;
            this.task = requestData.Task__c;
            this.attachmentDoc = requestData.AttachmentDoc__c;
            this.targetManagement = requestData.TargetManagement__c;
            this.lastModifiedDate = requestData.LastModifiedDate;
        }catch(error){
            this.error = error;
        }
    }

    //ボタンクリック時処理
    async handleClick(event){
        switch(event.target.name){
            //編集ボタンクリック時処理
            case 'edit' : {
                console.log('edit start');
                const result = await cksDataMigrationRequestRecordCreateEdit.open({
                    size: 'medium',
                    description: 'demo',
                    isCreate : false,
                    isCopy : false,
                    recordId: this.recordId,
                });
                if(result?.isSuccess){
                    console.log('edit end');
                    this.refresh();
                }
                break;
            }
            //削除ボタンクリック時処理
            case 'delete' :
                this.handleDelete();
                break;
            //コピーボタンクリック時処理
            case 'copy':{
                const result = await cksDataMigrationRequestRecordCreateEdit.open({
                    size: 'medium',
                    description: 'demo',
                    isCreate : true,
                    isCopy : true,
                    recordId: this.recordId,
                });
                if(result?.isSuccess){
                    this.refresh();
                }
                break;
            }
        }
    }

    //削除ボタンクリック時処理
    async handleDelete() {
        const result = await LightningConfirm.open(DELETE_CONFIRM_MESSAGE);
        if (result) {
            try {
                const deleteResult = await deleteDataMigrationRequest({
                    recordId: this.recordId,
                    lastModifiedDate: this.lastModifiedDate
                });
    
                if (deleteResult.isSuccess) {
                    this.errorMessages = null;
                
                    try {

                        const currentTb = await workspaceAPI.getFocusedTabInfo();
                        // 申込基本情報の詳細ページを新規タブで開く
                        await workspaceAPI.openTab({
                            recordId: this.moshikomiKihonJoho,
                            focus: true
                        });
                
                        // 削除した申込詳細情報のタブを閉じる
                        await workspaceAPI.closeTab(currentTb.tabId);
                
                    } catch (tabError) {
                        console.error('タブ操作に失敗しました:', tabError);
                    }
                } else {
                    this.errorMessages = deleteResult.errorMessages.map((value, index) => {
                        return { key: index, message: value };
                    });
                }
    
            } catch (error) {
                this.error = error;
            }
        }
    }

    //再表示処理
    async refresh(){
        this.isLoading = true;
        this.errorMessages = null;
        this.init();
        await refreshApex(this.wiredResult);
        this.isLoading = false;
    }

    //処理完了待ちへ更新ボタンクリック時処理
    async complete(){
        this.isLoading = true;
        const result = await LightningConfirm.open(STATUSUPDATE_CONFIRM);
        if(!result){
            this.isLoading = false;
            return;
        }
        try{
            const result =  await updateMoshikomiStatus({recordId : this.recordId, lastModifiedDate: this.lastModifiedDate});
            if(result.isSuccess){
                this.errorMessages = null;
                this.refresh();
            }else{
                this.errorMessages = result.errorMessages.map( (value,index) =>{
                    return ({
                        key : index,
                        message : value
                    });
                });
            }
        }catch(error){
            this.error = error;
        }finally{
            this.isLoading = false;
        }
    }

    /**
     * 各項目の表示・非表示を判定するゲッター
     */
    get visibility() {
        const visObj = {};
        
        // FIELD_VISIBILITYで定義した各項目について判定
        Object.keys(FIELD_VISIBILITY).forEach(key => {
            // 現在の移行種別が、定義された配列に含まれているかチェック
            visObj[key] = FIELD_VISIBILITY[key].includes(this.migrationType);
        });
        
        return visObj;
    }

    /** 参考資料の表示データ */
    get referenceMaterials() {
        return REFERENCE_MATERIALS_CONFIG[this.migrationType] || [];
    }

    /** 参考資料があるかどうか */
    get hasReferenceMaterials() {
        return this.referenceMaterials.length > 0;
    }

    /**
     * 各オブジェクトの現在の値（True/False）に応じた表示用オブジェクトを返す
     * 複数のメッセージをメッセージ配列として返す
     * HTML側では {displayMessages.individual.messages} でループして参照
     */
    get displayMessages() {
        const msgObj = {};
        Object.keys(MESSAGES_CONFIG).forEach(key => {
            const isChecked = this[key] || false; 
            const config = MESSAGES_CONFIG[key];
            const messages = [];
            let messageIndex = 0;

            // 基本メッセージを追加
            const baseText = isChecked ? config.base.true : config.base.false;
            const baseImg = isChecked ? config.base.trueImg : config.base.falseImg;
            
            if (baseText || baseImg) {
                messages.push({
                    id: `${key}_${messageIndex++}`,
                    text: baseText,
                    img: baseImg
                });
            }

            // 複合条件メッセージを追加
            if (config.conditions) {
                config.conditions.forEach((combo) => {
                    if (combo.condition(this)) {
                        messages.push({
                            id: `${key}_${messageIndex++}`,
                            text: combo.text,
                            img: combo.img
                        });
                    }
                });
            }

            msgObj[key] = {
                messages: messages,
                hasContent: messages.length > 0
            };
        });
        return msgObj;
    }

}