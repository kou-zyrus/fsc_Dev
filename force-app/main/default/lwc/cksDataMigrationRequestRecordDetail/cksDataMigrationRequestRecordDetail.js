/**
 * @description
 * CAMPSのデータ移行依頼のレコード詳細情報表示用コンポーネント
*/
import { LightningElement, wire, api } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { getRecord } from 'lightning/uiRecordApi';
import LightningConfirm from "lightning/confirm";
import { refreshApex } from '@salesforce/apex';
import workspaceAPI from 'lightning/platformWorkspaceApi';
import cksDataMigrationRequestRecordCreateEdit from 'c/cksDataMigrationRequestRecordCreateEdit';

import ID_FIELD from '@salesforce/schema/DataMigrationRequest__c.Id';

import IMAGES from '@salesforce/resourceUrl/DataMigrationRequestImages';

import { deleteRecord } from 'lightning/uiRecordApi';
import getEditSetupData from '@salesforce/apex/CKS_CTRL_DataMigrationRequest.getEditSetupData';

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
const TYPE_POLICYS_TRANSFER = '一部証券移管';
const TYPE_ALLDATA_EXPORT = '全データ抽出';
const TYPE_SPECIFICDATA_EXPORT = '一部データ抽出';
const TYPE_TOA_BULKPATCH = 'トーア一括パッチ';
const TYPE_OTHER_PATCH = 'その他データパッチ';

/** 簡易スケジュール定義（移行日の何営業日前までに何を実施するか） */
const TYPE_NEW_USE_SCHEDULE = [
    { businessDaysBefore: 20, label: '販管の移行件数と特約移行件数を連携' },
    { businessDaysBefore: 8, label: '特約事前移行' },
    { businessDaysBefore: 5, label: '事前データ抽出' },
    { businessDaysBefore: 1, label: '販管ファイル出力設定' }
];

const TYPE_INTEGRATION_USED_SCHEDULE = [
    { businessDaysBefore: 20, label: '販管の移行件数と特約移行件数を連携' },
    { businessDaysBefore: 8, label: '特約事前移行' },
    { businessDaysBefore: 5, label: '事前データ抽出' },
    { businessDaysBefore: 1, label: '販管ファイル出力設定' }
];

const TYPE_INTEGRATION_UNUSED_SCHEDULE = [
    { businessDaysBefore: 20, label: '販管の移行件数と特約移行件数を連携' },
    { businessDaysBefore: 8, label: '特約事前移行' },
    { businessDaysBefore: 5, label: '事前データ抽出' },
    { businessDaysBefore: 1, label: '販管ファイル出力設定' }
];

const TYPE_POLICYS_TRANSFER_SCHEDULE = [
    { businessDaysBefore: 20, label: '販管の移行件数と特約移行件数を連携' },
    { businessDaysBefore: 8, label: '特約事前移行' },
    { businessDaysBefore: 5, label: '事前データ抽出' },
    { businessDaysBefore: 1, label: '販管ファイル出力設定' }
];

const TYPE_ALLDATA_EXPORT_SCHEDULE = [
    { businessDaysBefore: 20, label: '販管の移行件数と特約移行件数を連携' },
    { businessDaysBefore: 8, label: '特約事前移行' },
    { businessDaysBefore: 5, label: '事前データ抽出' },
    { businessDaysBefore: 1, label: '販管ファイル出力設定' }
];

const TYPE_SPECIFICDATA_EXPORT_SCHEDULE = [
    { businessDaysBefore: 20, label: '販管の移行件数と特約移行件数を連携' },
    { businessDaysBefore: 8, label: '特約事前移行' },
    { businessDaysBefore: 5, label: '事前データ抽出' },
    { businessDaysBefore: 1, label: '販管ファイル出力設定' }
];

const TYPE_TOA_BULKPATCH_SCHEDULE = [
    { businessDaysBefore: 20, label: '販管の移行件数と特約移行件数を連携' },
    { businessDaysBefore: 8, label: '特約事前移行' },
    { businessDaysBefore: 5, label: '事前データ抽出' },
    { businessDaysBefore: 1, label: '販管ファイル出力設定' }
];

const TYPE_OTHER_PATCH_SCHEDULE = [
    { businessDaysBefore: 20, label: '販管の移行件数と特約移行件数を連携' },
    { businessDaysBefore: 8, label: '特約事前移行' },
    { businessDaysBefore: 5, label: '事前データ抽出' },
    { businessDaysBefore: 1, label: '販管ファイル出力設定' }
];

const SCHEDULE_CONFIG = {
    [TYPE_NEW_USE]: TYPE_NEW_USE_SCHEDULE,
    [TYPE_INTEGRATION_USED]: TYPE_INTEGRATION_USED_SCHEDULE,
    [TYPE_INTEGRATION_UNUSED]: TYPE_INTEGRATION_UNUSED_SCHEDULE,
    [TYPE_POLICYS_TRANSFER]: TYPE_POLICYS_TRANSFER_SCHEDULE,
    [TYPE_ALLDATA_EXPORT]: TYPE_ALLDATA_EXPORT_SCHEDULE,
    [TYPE_SPECIFICDATA_EXPORT]: TYPE_SPECIFICDATA_EXPORT_SCHEDULE,
    [TYPE_TOA_BULKPATCH]: TYPE_TOA_BULKPATCH_SCHEDULE,
    [TYPE_OTHER_PATCH]: TYPE_OTHER_PATCH_SCHEDULE
};

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
    migrationAssociateCode: [TYPE_INTEGRATION_USED, TYPE_INTEGRATION_UNUSED, TYPE_POLICYS_TRANSFER],
    existingContractCustomerNotes: [TYPE_NEW_USE, TYPE_INTEGRATION_USED, TYPE_INTEGRATION_UNUSED, TYPE_POLICYS_TRANSFER, TYPE_SPECIFICDATA_EXPORT, TYPE_TOA_BULKPATCH, TYPE_OTHER_PATCH],
    individual: [TYPE_NEW_USE, TYPE_INTEGRATION_USED, TYPE_INTEGRATION_UNUSED, TYPE_POLICYS_TRANSFER, TYPE_SPECIFICDATA_EXPORT, TYPE_OTHER_PATCH],
    masterGroupCustomerNotes: [TYPE_INTEGRATION_USED, TYPE_POLICYS_TRANSFER],
    childGroup: [TYPE_NEW_USE, TYPE_INTEGRATION_USED, TYPE_INTEGRATION_UNUSED, TYPE_POLICYS_TRANSFER, TYPE_SPECIFICDATA_EXPORT, TYPE_OTHER_PATCH],
    household: [TYPE_NEW_USE, TYPE_INTEGRATION_USED, TYPE_INTEGRATION_UNUSED, TYPE_POLICYS_TRANSFER, TYPE_SPECIFICDATA_EXPORT, TYPE_OTHER_PATCH],
    relative: [TYPE_INTEGRATION_USED, TYPE_POLICYS_TRANSFER, TYPE_SPECIFICDATA_EXPORT, TYPE_OTHER_PATCH],
    campaign: [TYPE_INTEGRATION_USED, TYPE_POLICYS_TRANSFER, TYPE_SPECIFICDATA_EXPORT, TYPE_OTHER_PATCH],
    otherCompany: [TYPE_NEW_USE, TYPE_INTEGRATION_USED, TYPE_INTEGRATION_UNUSED, TYPE_POLICYS_TRANSFER, TYPE_SPECIFICDATA_EXPORT, TYPE_OTHER_PATCH],
    riderOtherCompany: [TYPE_INTEGRATION_USED, TYPE_POLICYS_TRANSFER, TYPE_SPECIFICDATA_EXPORT, TYPE_OTHER_PATCH],
    opportunity: [TYPE_INTEGRATION_USED, TYPE_POLICYS_TRANSFER, TYPE_SPECIFICDATA_EXPORT, TYPE_OTHER_PATCH],
    graspIntention: [TYPE_INTEGRATION_USED, TYPE_POLICYS_TRANSFER, TYPE_SPECIFICDATA_EXPORT, TYPE_OTHER_PATCH],
    personalInformationHandling: [TYPE_INTEGRATION_USED, TYPE_POLICYS_TRANSFER, TYPE_SPECIFICDATA_EXPORT, TYPE_OTHER_PATCH],
    dailyReport: [TYPE_INTEGRATION_USED, TYPE_POLICYS_TRANSFER, TYPE_SPECIFICDATA_EXPORT, TYPE_OTHER_PATCH],
    event: [TYPE_NEW_USE, TYPE_INTEGRATION_USED, TYPE_INTEGRATION_UNUSED, TYPE_POLICYS_TRANSFER, TYPE_SPECIFICDATA_EXPORT, TYPE_OTHER_PATCH],
    task: [TYPE_INTEGRATION_USED, TYPE_POLICYS_TRANSFER, TYPE_SPECIFICDATA_EXPORT, TYPE_OTHER_PATCH],
    attachmentDoc: [TYPE_INTEGRATION_USED, TYPE_POLICYS_TRANSFER, TYPE_SPECIFICDATA_EXPORT, TYPE_OTHER_PATCH],
    targetManagement: [TYPE_INTEGRATION_USED, TYPE_POLICYS_TRANSFER, TYPE_SPECIFICDATA_EXPORT, TYPE_OTHER_PATCH],
};

/** 移行対象オブジェクトごとのメッセージ定義 */
const MESSAGES_CONFIG = {
    individual: {
        base: {
            true: false,
            false: '白地顧客を移行しない場合、白地顧客に紐づく対応・案件及び意向把握・世帯及び世帯リレーション・関係者情報・他社保険契約お及び他社特約・募集企画対象者・個人情報取り扱い・タスク・添付書類のデータも移行されません。'
        },
        conditions: [
            {
                condition: (component) => !component.individual && component.otherCompany,
                text: '【他社証券データについて】移行元において被保険者として白地顧客が設定されていると、白地顧客が移行されない場合に該当の他社証券データの編集時にエラーが発生するため、該当する他社証券データの被保険者項目はブランクにします。',
                img: IMAGES + '/indivisualOtherCompany.png'
            }
        ]
    },
    existingContractCustomerNotes: {
        base: {
            true: '移行対象の判定\n事前抽出作業時点の移行元代理店の自社保険契約について、事前抽出作業時点では移行先代理店に存在しないが移行日の移行先代理店に存在するものを移行対象の自社保険契約データとし、これらの自社保険契約データに契約者として紐づく顧客を下記3パターンで判定します。\n\n①移行対象：事前抽出作業時点では移行先代理店に既契約者として存在しないが、移行日に既契約者として存在する\n②移行対象外：移行先代理店に事前抽出作業時点、移行日にどちらも既契約者として存在する\n③移行対象外：移行先代理店に事前抽出作業時点、移行日にどちらも既契約者として存在しない\n\n移行対象となった既契約者について、移行元代理店の顧客注意事項データを移行します。\nただし、移行日に移行先代理店の顧客注意事項が存在していた場合、移行元代理店データによる上書きはおこないません\nまた、移行日に移行元代理店・移行先代理店の両方に顧客注意事項が存在しない既契約者については、空の顧客注意事項を移行先代理店に作成します。\n※移行対象外となった既契約者データ及び顧客注意事項データは判定理由を付与してエクセルファイルにてご連携します',
            false: false
        },
        conditions: []
    },
    masterGroupCustomerNotes: {
        base: {
            true: '移行対象の判定\n事前抽出作業時点の移行元代理店のマスタ団体について、下記3パターンで判定します。\n\n①移行対象：事前抽出作業時点では移行先代理店にマスタ団体として存在しないが、移行日にマスタ団体として存在する\n②移行対象外：移管先代理店に事前抽出作業時点、移行日にどちらもマスタ団体として存在する\n③移行対象外：移管先代理店に事前抽出作業時点、移行日にどちらもマスタ団体として存在しない\n\n移行対象となったマスタ団体について、移行元代理店の顧客注意事項データを移行します。\nただし、移行日に移行先代理店の顧客注意事項が存在していた場合、移行元代理店データによる上書きはおこないません\nまた、移行日に移行元代理店・移行先代理店の両方に顧客注意事項が存在しないマスタ団体については、空の顧客注意事項を移行先代理店に作成します。\n※移行対象外となったマスタ団体データ及び顧客注意事項データは判定理由を付与してエクセルファイルにてご連携します',
            false: false
        },
        conditions: []
    },
    household: {
        base: {
            true: '移行対象の顧客に紐づく世帯及び世帯リレーションのみ移行対象となります。\n\n白地顧客が移行対象外の場合の移行作業イメージ',
            trueImg: IMAGES + '/household.png',
            false: false
        },
        conditions: []
    },
    relative: {
        base: {
            true: '「顧客」「関係者名」の両項目に移行対象顧客が設定されている関係者情報のみ移行対象となり、いずれかのみ移行対象顧客が設定されている場合は該当データを削除します。',
            false: false
        },
        conditions: []
    },
    childGroup: {
        base: {
            true: false,
            false: '白地団体を以降しない場合、顧客の「団体」「団体第2階層」「団体第3階層」に移行元の白地団体が設定されていると画面からの顧客情報の編集や手動名寄せにおいてエラーとなるため、移行対象顧客の該当項目に移行元の白地団体が設定されていた場合はブランクにします。',
            falseImg: IMAGES + '/childGroup.png'
        },
        conditions: []
    },
    campaign: {
        base: { true: false, false: false },
        conditions: [
            {
                condition: (component) => component.campaign && component.migrationType === TYPE_POLICYS_TRANSFER,
                text: '移管証券が紐づく募集企画対象者(DM発送履歴)及び、それらが登録されている募集企画のみ移行します。'
            }
        ]
    }
};

export default class cksDataMigrationRequestRecordDetail extends NavigationMixin(LightningElement) {
        /********************* 公開プロパティ *********************/
    //申込詳細情報レコードID
    @api recordId;

    /********************* 汎用制御用プロパティ *********************/
    //ロード中制御
    isLoading = false;
    //注意事項トグルの開閉状態（デフォルト全閉）
    messageOpenFlags = Object.fromEntries(Object.keys(MESSAGES_CONFIG).map(key => [key, false]));
    //内部用の表示セクション
    internalActiveSections = ['A', 'B', 'C'];
    //参考資料セクションの自動展開を1回だけ実行するためのフラグ
    hasAppliedReferenceAutoOpen = false;
    //描画後の再設定を重複実行しないためのフラグ
    isReferenceAutoOpenQueued = false;
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
    //移行元代理店コード(７桁)
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

    //描画後処理
    renderedCallback() {
        if (!this.hasReferenceMaterials || this.hasAppliedReferenceAutoOpen || this.isReferenceAutoOpenQueued) {
            return;
        }

        this.isReferenceAutoOpenQueued = true;
        setTimeout(() => {
            this.internalActiveSections = ['A', 'R', 'B', 'C'];
            this.hasAppliedReferenceAutoOpen = true;
            this.isReferenceAutoOpenQueued = false;
        }, 0);
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
            this.masterGroupCustomerNotes = requestData.MasterGroupCustomerNotes__c;
            this.childGroup = requestData.ChildGroup__c;
            this.household = requestData.Household__c;
            this.relative = requestData.Relative__c;
            this.campaign = requestData.Campaign__c;
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
            this.setDefaultActiveSections();
        }catch(error){
            this.error = error;
            this.internalActiveSections = ['A', 'B', 'C'];
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
                if (result?.isSuccess || result?.status === 'cancel') {
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
                if (result?.isSuccess && result?.recordId) {
                    this[NavigationMixin.Navigate]({
                        type: 'standard__recordPage',
                        attributes: {
                            recordId: result.recordId,
                            objectApiName: 'DataMigrationRequest__c',
                            actionName: 'view'
                        }
                    });
                } else if (result?.status === 'cancel') {
                    this.refresh();
                }
                break;
            }
        }
    }

    //削除ボタンクリック時処理
    async handleDelete() {
        const result = await LightningConfirm.open(DELETE_CONFIRM_MESSAGE);
        if (!result) return;

        this.isLoading = true;
        try {
            await deleteRecord(this.recordId);
            window.location.assign('/lightning/o/DataMigrationRequest__c/list');
        } catch (error) {
            this.error = error;
            this.isLoading = false;
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

    /** 注意事項トグルのクリック処理 */
    handleMessageToggle(event) {
        const key = event.currentTarget.dataset.key;
        this.messageOpenFlags = { ...this.messageOpenFlags, [key]: !this.messageOpenFlags[key] };
    }

    /** 確認事項をすべて開く（トグルが表示されている項目のみ） */
    handleOpenAll() {
        const msgs = this.displayMessages;
        this.messageOpenFlags = Object.fromEntries(
            Object.keys(this.messageOpenFlags).map(key => [key, msgs[key]?.hasContent === true])
        );
    }

    /** 確認事項をすべて閉じる */
    handleCloseAll() {
        this.messageOpenFlags = Object.fromEntries(Object.keys(this.messageOpenFlags).map(key => [key, false]));
    }

    /** 注意事項トグルのアイコン名（開閉状態に応じて切り替え） */
    get messageToggleIcons() {
        const icons = {};
        Object.keys(this.messageOpenFlags).forEach(key => {
            icons[key] = this.messageOpenFlags[key] ? 'utility:chevrondown' : 'utility:chevronright';
        });
        return icons;
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

    /** 参考資料の有無に応じてデフォルト展開セクションを設定 */
    setDefaultActiveSections() {
        if (this.hasReferenceMaterials) {
            this.internalActiveSections = ['A', 'B', 'C'];
            this.hasAppliedReferenceAutoOpen = false;
            return;
        }

        this.internalActiveSections = ['A', 'B', 'C'];
        this.hasAppliedReferenceAutoOpen = true;
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

    /**
     * 移行種別と移行日に応じた簡易スケジュールを返す
     */
    get scheduleSteps() {
        const scheduleConfig = SCHEDULE_CONFIG[this.migrationType];
        const baseDate = this.parseDate(this.migrationDate);

        if (!scheduleConfig || !baseDate) {
            return {
                hasSchedule: false,
                steps: []
            };
        }

        const clipDefault = 'clip-path:polygon(0 0, calc(100% - 18px) 0, 100% 50%, calc(100% - 18px) 100%, 0 100%, 18px 50%)';
        const clipFirst   = 'clip-path:polygon(0 0, calc(100% - 18px) 0, 100% 50%, calc(100% - 18px) 100%, 0 100%)';
        const chevronBase  = `flex:0 0 220px; min-height:88px; background:#d9e3ef; color:#2a3b4f; margin-right:2px; padding:10px 24px 10px 20px; ${clipDefault}`;
        const chevronFirst = `flex:0 0 220px; min-height:88px; background:#d9e3ef; color:#2a3b4f; margin-right:2px; padding:10px 24px 10px 14px; ${clipFirst}`;
        const chevronFinal = `flex:0 0 220px; min-height:88px; background:#c7d7e8; color:#2a3b4f; margin-right:2px; padding:10px 24px 10px 20px; ${clipDefault}`;

        // すべて「移行日」を基準に営業日逆算する
        const steps = scheduleConfig.map((item, index) => {
            const targetDate = this.subtractBusinessDays(baseDate, item.businessDaysBefore);
            return {
                id: `schedule_${index}`,
                label: item.label,
                deadlineLabel: `移行日-${item.businessDaysBefore}営業日`,
                dateLabel: this.formatDate(targetDate),
                itemClass: index === 0 ? 'schedule-chevron schedule-chevron-first' : 'schedule-chevron',
                itemStyle: index === 0 ? chevronFirst : chevronBase
            };
        });

        steps.push({
            id: `schedule_${steps.length}`,
            label: '移行実施',
            deadlineLabel: '移行日',
            dateLabel: this.formatDate(baseDate),
            itemClass: 'schedule-chevron schedule-chevron-final',
            itemStyle: chevronFinal
        });

        return {
            hasSchedule: true,
            steps
        };
    }

    /**
     * YYYY-MM-DD / ISO 文字列を Date に変換する
     */
    parseDate(value) {
        if (!value) {
            return null;
        }

        if (value instanceof Date && !Number.isNaN(value.getTime())) {
            return new Date(value.getFullYear(), value.getMonth(), value.getDate());
        }

        if (typeof value === 'string') {
            const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (match) {
                const [, year, month, day] = match;
                return new Date(Number(year), Number(month) - 1, Number(day));
            }
        }

        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            return null;
        }

        return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    }

    /**
     * 指定日から営業日（土日除く）で逆算した日付を返す
     */
    subtractBusinessDays(date, businessDays) {
        const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        let remain = businessDays;

        while (remain > 0) {
            result.setDate(result.getDate() - 1);
            const day = result.getDay();
            if (day !== 0 && day !== 6) {
                remain -= 1;
            }
        }

        return result;
    }

    /**
     * 日付を YYYY/MM/DD 形式で返す
     */
    formatDate(date) {
        if (!date) {
            return '';
        }

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}/${month}/${day}`;
    }

}