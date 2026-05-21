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
import getMemos from '@salesforce/apex/CKS_CTRL_DataMigrationRequest.getMemos';
import saveMemo from '@salesforce/apex/CKS_CTRL_DataMigrationRequest.saveMemo';
import getScheduleSteps from '@salesforce/apex/CKS_CTRL_DataMigrationRequest.getScheduleSteps';

/** 削除確認メッセージ */
const DELETE_CONFIRM_MESSAGE = {
    label: '削除確認',
    message: 'レコードを削除します。よろしいですか？', 
    theme: 'default', // 省略可能
    variant: 'header' // デフォルトはheader。
};

/** 移行種別の定数（MESSAGES_CONFIG・REFERENCE_MATERIALS_CONFIGで参照するもののみ） */
const TYPE_INTEGRATION_USED = '代理店統合(利用済み代理店間)';
const TYPE_POLICYS_TRANSFER = '一部証券移管';

/** 参考資料の表示定義 */
const REFERENCE_MATERIALS_CONFIG = {
    [TYPE_INTEGRATION_USED]: [
        {
            title: '2026年3月実施_ABC開発→J&S移行要件',
            url: 'https://aflacjpn.box.com/s/1t5rc3z65d9u1uxphxerd8jk0jogxsi3'
        }
    ]
};

/** 各項目のJSキー → DataMigrationRequest__c項目APIの対応定義 */
const FIELD_API_MAP = {
    migrationAssociateCode:              'MigrationAssociateCode__c',
    existingContractCustomerNotes:       'ExistingContractCustomerNotes__c',
    individual:                          'Individual__c',
    masterGroupCustomerNotes:            'MasterGroupCustomerNotes__c',
    childGroup:                          'ChildGroup__c',
    user:                                'User__c',
    recordTypeMaster:                    'RecordTypeMaster__c',
    associateBranchMaster:               'AssociateBranchMaster__c',
    masterGroup:                         'MasterGroup__c',
    childGroupOnly:                      'ChildGroupOnly__c',
    household:                           'Household__c',
    individualOnly:                      'IndividualOnly__c',
    existingContract:                    'ExistingContract__c',
    clientClassificationMaster:          'ClientClassificationMaster__c',
    customerNotes:                       'CustomerNotes__c',
    relative:                            'Relative__c',
    accountContactRelation:              'AccountContactRelation__c',
    campaignOnly:                        'CampaignOnly__c',
    campaignMember:                      'CampaignMember__c',
    campaign:                            'Campaign__c',
    otherCompany:                        'OtherCompany__c',
    ownCompany:                          'OwnCompany__c',
    riderOwnCompany:                     'RiderOwnCompany__c',
    riderOtherCompany:                   'RiderOtherCompany__c',
    incomingChannelLeadsMaster:          'IncomingChannel_LeadsMaster__c',
    opportunity:                         'Opportunity__c',
    opportunityInsurancePolicyAssociation: 'OpportunityInsurancePolicyAssociation__c',
    designDocument:                      'DesignDocument__c',
    graspIntention:                      'GraspIntention__c',
    comparisonRecommendedProduct:        'ComparisonRecommendedProduct__c',
    bringOut:                            'BringOut__c',
    shipping:                            'Shipping__c',
    receipt:                             'Receipt__c',
    storage:                             'Storage__c',
    personalInformationHandling:         'PersonalInformationHandling__c',
    dailyReport:                         'DailyReport__c',
    contactClassMaster:                  'ContactClassMaster__c',
    event:                               'Event__c',
    texttemplate:                        'Texttemplate__c',
    task:                                'Task__c',
    attachmentDoc:                       'AttachmentDoc__c',
    planningTargetClassification:        'PlanningTargetClassification__c',
    agencyContactMaster:                 'AgencyContactMaster__c',
    targetManagement:                    'TargetManagement__c',
    contact:                             'Contact__c',
    status:                              'Status__c',
    product2:                            'Product2__c',
    productCommissionPercent:            'ProductCommissionPercent__c',
    analyticsPermissionMaster:           'AnalyticsPermissionMaster__c',
    contentDocumentLink:                 'ContentDocumentLink__c',
    contentVersion:                      'ContentVersion__c',
    cksDesignDocumentDivision:           'CKS_DesignDocumentDivision__c',
    otherRequest:                        'OtherRequest__c',
};

/** 移行対象オブジェクトごとのメッセージ定義 */
const MESSAGES_CONFIG = {
    individual: {
        base: {
            true: false,
            false: '白地顧客を移行しない場合、白地顧客に紐づく対応・案件及び意向把握・世帯及び世帯リレーション・関係者情報・他社保険契約お及び他社特約・募集企画対象者・個人情報取り扱い・タスク・添付書類のデータも移行されません。'
        },
        conditions: []
    },
    otherCompany: {
        base: {
            true: '移行元において被保険者として移行対象外顧客が設定されていると、移行先における該当の他社証券データの編集時にエラーが発生するため、該当する他社証券データの被保険者項目はブランクにします。',
            trueImg: IMAGES + '/indivisualOtherCompany.png',
            false: false
        },
        conditions: []
    },
    existingContractCustomerNotes: {
        base: {
            true: [
                '移行対象の判定\n移行日の移行先代理店の自社保険契約に契約者として紐づく顧客について、移行元代理店にも存在する顧客を移行対象の既契約者データとします。',
                '顧客注意事項データ及び関連データの処理\n移行対象となった既契約者について、移行元代理店の顧客注意事項データを移行します。\nただし、移行日に移行先代理店の顧客注意事項が存在していた場合、移行元代理店データによる上書きはおこないません\nまた、移行日に移行元代理店・移行先代理店の両方に顧客注意事項が存在しない既契約者については、空の顧客注意事項を移行先代理店に作成します。\n※移行対象外となった移行元代理店の既契約者データ及び顧客注意事項データは判定理由を付与してエクセルファイルにてご連携します。\n\n移行対象外となった既契約者に紐づく対応・案件及び意向把握・世帯及び世帯リレーション・関係者情報・他社保険契約お及び他社特約・募集企画対象者・個人情報取り扱い・タスク・添付書類のデータも移行されません。'
            ],
            false: false
        },
        conditions: []
    },
    masterGroupCustomerNotes: {
        base: {
            true: [
                '移行対象の判定\n移行日の移行先代理店のマスタ団体について、移行元代理店にも存在するマスタ団体を移行対象のマスタ団体データとします。',
                '顧客注意事項データ及び関連データの処理\n移行対象となったマスタ団体について、移行元代理店の顧客注意事項データを移行します。\nただし、移行日に移行先代理店の顧客注意事項が存在していた場合、移行元代理店データによる上書きはおこないません\nまた、移行日に移行元代理店・移行先代理店の両方に顧客注意事項が存在しないマスタ団体については、空の顧客注意事項を移行先代理店に作成します。\n※移行対象外となったマスタ団体データ及び顧客注意事項データは判定理由を付与してエクセルファイルにてご連携します\n\n移行対象外となったマスタ団体に紐づく対応のデータも移行されません。'
                ],
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
            false: '白地団体を以降しない場合、顧客の「団体」「団体第2階層」「団体第3階層」に移行元の白地団体が設定されていると画面からの顧客情報の編集や手動名寄せにおいてエラーとなるため、移行対象顧客の該当項目に移行元の白地団体が設定されていた場合はブランクにします。\n\n白地団体を移行しない場合、白地団体に紐づく対応データも移行されません。',
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
    },
    event: {
        base: {
            true: 'Salesforceの仕様により下記のデータの編集が制限されているため、独立した対応データとして内容をコピーして作成します\n・繰り返し対応について、日付が過去のデータ\n・招待対応について、招待先のデータ',
            false: false
        },
        conditions: []
    }
};

/**
 * セクションBの全項目定義（key → 画面表示ラベル）
 * FIELD_VISIBILITYの表示順と一致させる（migrationAssociateCode・otherRequestは除く）
 */
const TOGGLE_ITEMS = {
    existingContractCustomerNotes: '既契約者の顧客注意事項',
    individual:                    '白地顧客及び白地顧客の顧客注意事項',
    masterGroupCustomerNotes:      'マスタ団体の顧客注意事項',
    childGroup:                    '白地団体及び白地団体の顧客注意事項',
    user:                          'ユーザ',
    recordTypeMaster:              'レコードタイプマスター',
    associateBranchMaster:         '代理店出先マスタ',
    masterGroup:                   'マスタ団体',
    childGroupOnly:                '白地団体',
    household:                     '世帯',
    individualOnly:                '白地顧客',
    existingContract:              '既契約者',
    clientClassificationMaster:    '顧客分類マスタ',
    customerNotes:                 '顧客注意事項',
    relative:                      '関係者情報',
    accountContactRelation:        '取引先と取引先責任者のリレーション',
    campaignOnly:                  '募集企画',
    campaignMember:                'キャンペーンメンバー',
    campaign:                      '募集企画及び募集企画対象者',
    otherCompany:                  '他社保険契約',
    ownCompany:                    '自社保険契約',
    riderOwnCompany:               '自社特約',
    riderOtherCompany:             '他社特約',
    incomingChannelLeadsMaster:    '受付経路マスタ',
    opportunity:                   '案件',
    opportunityInsurancePolicyAssociation: '案件保険契約関係',
    designDocument:                '設計書',
    graspIntention:                '意向把握',
    comparisonRecommendedProduct:  '比較推奨商品',
    bringOut:                      '持出履歴',
    shipping:                      '発送履歴',
    receipt:                       '受領履歴',
    storage:                       '個人データ管理',
    personalInformationHandling:   '個人情報取り扱い(持出履歴・発送履歴・受領履歴・個人データ管理)',
    dailyReport:                   '日報',
    contactClassMaster:            '対応種別マスタ',
    event:                         '対応',
    texttemplate:                  'テキストテンプレート',
    task:                          'タスク',
    attachmentDoc:                 '添付書類',
    planningTargetClassification:  '募集企画対象者区分マスタ',
    agencyContactMaster:           '所属部署マスタ',
    targetManagement:              '目標',
    contact:                       '取引先責任者',
    status:                        '主契約ステータス',
    product2:                      '商品',
    productCommissionPercent:      '商品手数料率',
    analyticsPermissionMaster:     'Analytics権限マスタ',
    contentDocumentLink:           'ContentDocumentLink',
    contentVersion:                'ContentVersion',
    cksDesignDocumentDivision:     '設計書区分マスタ',
};

export default class cksDataMigrationRequestRecordDetail extends NavigationMixin(LightningElement) {
        /********************* 公開プロパティ *********************/
    //申込詳細情報レコードID
    @api recordId;

    /********************* 汎用制御用プロパティ *********************/
    //ロード中制御
    isLoading = false;
    //注意事項・メモトグルの開閉状態（デフォルト全閉）
    messageOpenFlags = Object.fromEntries(Object.keys(TOGGLE_ITEMS).map(key => [key, false]));
    //メモ入力値（key: TOGGLE_ITEMSのキー, value: 入力テキスト）
    memoValues = {};
    //保存済みメモ値（差分検出用）
    savedMemoValues = {};
    //DataMigrationTypeMaster__c.TargetObject__cの値（セミコロン区切り）をSetに変換したもの
    targetObjectSet = new Set();
    //DataMigrationTypeSchedule__cのレコード一覧（scheduleStepsゲッターで使用）
    scheduleStepsData = [];
    //スケジュール日付入力値（key: スケジュール名, value: 入力日付文字列）
    scheduleDateValues = {};
    //保存済みスケジュール日付値（差分検出用）
    savedScheduleDateValues = {};
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
    //全データ抽出専用項目
    user;
    recordTypeMaster;
    associateBranchMaster;
    masterGroup;
    childGroupOnly;
    individualOnly;
    existingContract;
    clientClassificationMaster;
    customerNotes;
    accountContactRelation;
    campaignOnly;
    campaignMember;
    ownCompany;
    riderOwnCompany;
    incomingChannelLeadsMaster;
    opportunityInsurancePolicyAssociation;
    designDocument;
    comparisonRecommendedProduct;
    bringOut;
    shipping;
    receipt;
    storage;
    contactClassMaster;
    texttemplate;
    planningTargetClassification;
    agencyContactMaster;
    contact;
    status;
    product2;
    productCommissionPercent;
    analyticsPermissionMaster;
    contentDocumentLink;
    contentVersion;
    cksDesignDocumentDivision;

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
        // スケジュール日付入力: 保存済み値の反映
        this.template.querySelectorAll('input.schedule-date-input').forEach(input => {
            const stepLabel = input.dataset.stepLabel;
            const savedValue = this.scheduleDateValues[stepLabel] || '';
            if (input.value !== savedValue) {
                input.value = savedValue;
            }
        });

        // メモ textarea: 保存済み値の反映と高さ自動調整
        this.template.querySelectorAll('textarea.memo-textarea').forEach(ta => {
            const key = ta.dataset.key;
            const savedValue = this.memoValues[key] || '';
            if (ta.value !== savedValue) {
                ta.value = savedValue;
            }
            ta.style.height = 'auto';
            ta.style.height = ta.scrollHeight + 'px';
        });

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
            this.migrationType = requestData.MigrationTypeLookUp__r?.Name || '';
            this.migrationDate = requestData.MigrationDate__c;
            const rawTargetObject = requestData.MigrationTypeLookUp__r?.TargetObject__c || '';
            this.targetObjectSet = new Set(rawTargetObject ? rawTargetObject.split(';') : []);
            const migrationTypeMasterId = requestData.MigrationTypeLookUp__c;
            if (migrationTypeMasterId) {
                this.scheduleStepsData = await getScheduleSteps({ migrationTypeMasterId });
            } else {
                this.scheduleStepsData = [];
            }
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
            this.user = requestData.User__c;
            this.recordTypeMaster = requestData.RecordTypeMaster__c;
            this.associateBranchMaster = requestData.AssociateBranchMaster__c;
            this.masterGroup = requestData.MasterGroup__c;
            this.childGroupOnly = requestData.ChildGroupOnly__c;
            this.individualOnly = requestData.IndividualOnly__c;
            this.existingContract = requestData.ExistingContract__c;
            this.clientClassificationMaster = requestData.ClientClassificationMaster__c;
            this.customerNotes = requestData.CustomerNotes__c;
            this.accountContactRelation = requestData.AccountContactRelation__c;
            this.campaignOnly = requestData.CampaignOnly__c;
            this.campaignMember = requestData.CampaignMember__c;
            this.ownCompany = requestData.OwnCompany__c;
            this.riderOwnCompany = requestData.RiderOwnCompany__c;
            this.incomingChannelLeadsMaster = requestData.IncomingChannel_LeadsMaster__c;
            this.opportunityInsurancePolicyAssociation = requestData.OpportunityInsurancePolicyAssociation__c;
            this.designDocument = requestData.DesignDocument__c;
            this.comparisonRecommendedProduct = requestData.ComparisonRecommendedProduct__c;
            this.bringOut = requestData.BringOut__c;
            this.shipping = requestData.Shipping__c;
            this.receipt = requestData.Receipt__c;
            this.storage = requestData.Storage__c;
            this.contactClassMaster = requestData.ContactClassMaster__c;
            this.texttemplate = requestData.Texttemplate__c;
            this.planningTargetClassification = requestData.PlanningTargetClassification__c;
            this.agencyContactMaster = requestData.AgencyContactMaster__c;
            this.contact = requestData.Contact__c;
            this.status = requestData.Status__c;
            this.product2 = requestData.Product2__c;
            this.productCommissionPercent = requestData.ProductCommissionPercent__c;
            this.analyticsPermissionMaster = requestData.AnalyticsPermissionMaster__c;
            this.contentDocumentLink = requestData.ContentDocumentLink__c;
            this.contentVersion = requestData.ContentVersion__c;
            this.cksDesignDocumentDivision = requestData.CKS_DesignDocumentDivision__c;

            // メモ・スケジュール日付 読み込み
            const memos = await getMemos({ recordId: this.recordId });
            const labelToKey = Object.fromEntries(
                Object.entries(TOGGLE_ITEMS).map(([k, v]) => [v, k])
            );
            const scheduleStepNames = new Set([
                ...(this.scheduleStepsData || []).map(s => s.Name),
                '移行実施'
            ]);
            const memoVals = {};
            const savedMemoVals = {};
            const scheduleDateVals = {};
            const savedScheduleDateVals = {};
            memos.forEach(memo => {
                if (scheduleStepNames.has(memo.TargetField__c)) {
                    scheduleDateVals[memo.TargetField__c] = memo.Memo__c || '';
                    savedScheduleDateVals[memo.TargetField__c] = memo.Memo__c || '';
                } else {
                    const key = labelToKey[memo.TargetField__c];
                    if (key) {
                        memoVals[key] = memo.Memo__c || '';
                        savedMemoVals[key] = memo.Memo__c || '';
                    }
                }
            });
            this.memoValues = memoVals;
            this.savedMemoValues = savedMemoVals;
            this.scheduleDateValues = scheduleDateVals;
            this.savedScheduleDateValues = savedScheduleDateVals;

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

    /** 確認事項・メモをすべて開く */
    handleOpenAll() {
        this.messageOpenFlags = Object.fromEntries(
            Object.keys(this.messageOpenFlags).map(key => [key, true])
        );
    }

    /** 確認事項・メモをすべて閉じる */
    handleCloseAll() {
        this.messageOpenFlags = Object.fromEntries(Object.keys(this.messageOpenFlags).map(key => [key, false]));
    }

    /** メモ入力値の変更追跡＋高さ自動調整 */
    handleMemoChange(event) {
        const key = event.currentTarget.dataset.key;
        this.memoValues = { ...this.memoValues, [key]: event.target.value };
        const ta = event.target;
        ta.style.height = 'auto';
        ta.style.height = ta.scrollHeight + 'px';
    }

    /** メモのフォーカスアウト時に保存 */
    async handleMemoSave(event) {
        const key = event.currentTarget.dataset.key;
        const label = TOGGLE_ITEMS[key];
        const memoText = this.memoValues[key] || '';
        const savedText = this.savedMemoValues[key] || '';
        if (memoText === savedText) return;
        try {
            await saveMemo({ recordId: this.recordId, targetField: label, memoText });
            this.savedMemoValues = { ...this.savedMemoValues, [key]: memoText };
        } catch (error) {
            this.error = error;
        }
    }

    /** スケジュール日付入力変更時に保存 */
    async handleScheduleDateChange(event) {
        const stepLabel = event.currentTarget.dataset.stepLabel;
        const dateText = event.target.value;
        const savedText = this.savedScheduleDateValues[stepLabel] || '';
        this.scheduleDateValues = { ...this.scheduleDateValues, [stepLabel]: dateText };
        if (dateText === savedText) return;
        try {
            await saveMemo({ recordId: this.recordId, targetField: stepLabel, memoText: dateText });
            this.savedScheduleDateValues = { ...this.savedScheduleDateValues, [stepLabel]: dateText };
        } catch (error) {
            this.error = error;
        }
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
     * DataMigrationTypeMaster__c.TargetObject__cに含まれるAPIの項目名に基づいて判定する
     */
    get visibility() {
        const visObj = {};
        Object.keys(FIELD_API_MAP).forEach(key => {
            visObj[key] = this.targetObjectSet.has(FIELD_API_MAP[key]);
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
     * セクションBの表示項目配列（可視 + TOGGLE_ITEMS に含まれる項目のみ）
     * for:each ループで使用する
     */
    get sectionBItems() {
        const vis = this.visibility;
        const msgs = this.displayMessages;
        return Object.entries(TOGGLE_ITEMS)
            .filter(([key]) => vis[key])
            .map(([key, label]) => {
                const msgData = msgs[key] || { messages: [], hasContent: false };
                const isOpen = this.messageOpenFlags[key] || false;
                const hasMemo = !!(this.memoValues[key]);
                const hasContent = msgData.hasContent;
                let indicatorText = '';
                if (hasContent && hasMemo) {
                    indicatorText = '確認事項・メモあり';
                } else if (hasContent) {
                    indicatorText = '確認事項あり';
                } else if (hasMemo) {
                    indicatorText = 'メモあり';
                }
                return {
                    key,
                    label,
                    checked: this[key] || false,
                    messages: msgData.messages,
                    hasContent,
                    isOpen,
                    memoValue: this.memoValues[key] || '',
                    toggleIcon: isOpen ? 'utility:chevrondown' : 'utility:chevronright',
                    indicatorText
                };
            });
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

            // 基本メッセージを追加（true/false に配列を渡すと要素ごとに別 li として表示）
            const baseValue = isChecked ? config.base.true : config.base.false;
            const baseImg   = isChecked ? config.base.trueImg : config.base.falseImg;
            const baseTexts = Array.isArray(baseValue) ? baseValue : (baseValue ? [baseValue] : []);

            if (baseTexts.length > 0 || baseImg) {
                if (baseTexts.length > 0) {
                    baseTexts.forEach((text, ti) => {
                        messages.push({
                            id: `${key}_${messageIndex++}`,
                            text,
                            img: ti === baseTexts.length - 1 ? baseImg : undefined
                        });
                    });
                } else {
                    messages.push({
                        id: `${key}_${messageIndex++}`,
                        text: false,
                        img: baseImg
                    });
                }
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
     * DataMigrationTypeSchedule__cのデータと移行日に応じた簡易スケジュールを返す
     */
    get scheduleSteps() {
        const data = this.scheduleStepsData;
        const baseDate = this.parseDate(this.migrationDate);

        if (!data || data.length === 0 || !baseDate) {
            return {
                hasSchedule: false,
                steps: []
            };
        }

        const clipDefault = 'clip-path:polygon(0 0, calc(100% - 18px) 0, 100% 50%, calc(100% - 18px) 100%, 0 100%, 18px 50%)';
        const clipFirst   = 'clip-path:polygon(0 0, calc(100% - 18px) 0, 100% 50%, calc(100% - 18px) 100%, 0 100%)';
        const styleBase  = `flex:0 0 220px; margin-right:2px; min-height:88px; background:#d9e3ef; color:#2a3b4f; padding:10px 24px 10px 20px; ${clipDefault}`;
        const styleFirst = `flex:0 0 220px; margin-right:2px; min-height:88px; background:#d9e3ef; color:#2a3b4f; padding:10px 24px 10px 14px; ${clipFirst}`;
        const styleFinal = `flex:0 0 220px; margin-right:2px; min-height:88px; background:#c7d7e8; color:#2a3b4f; padding:10px 24px 10px 20px; ${clipDefault}`;

        const steps = data.map((item, index) => {
            const businessDaysBefore = item.RequiredDays__c || 0;
            const targetDate = this.subtractBusinessDays(baseDate, businessDaysBefore);
            const outputs = item.Output__c ? [{ id: `out_${index}_0`, text: item.Output__c }] : [];
            return {
                id: `schedule_${index}`,
                label: item.Name,
                deadlineLabel: `移行日-${businessDaysBefore}営業日`,
                dateLabel: this.formatDate(targetDate),
                outputs,
                hasOutputs: outputs.length > 0,
                isMigrationDate: false,
                itemClass: index === 0 ? 'schedule-chevron schedule-chevron-first' : 'schedule-chevron',
                itemStyle: index === 0 ? styleFirst : styleBase,
                scheduleDateValue: this.scheduleDateValues[item.Name] || ''
            };
        });

        steps.push({
            id: `schedule_${steps.length}`,
            label: '移行実施',
            deadlineLabel: '移行日',
            dateLabel: this.formatDate(baseDate),
            outputs: [],
            hasOutputs: false,
            isMigrationDate: true,
            itemClass: 'schedule-chevron schedule-chevron-final',
            itemStyle: styleFinal,
            scheduleDateValue: this.scheduleDateValues['移行実施'] || ''
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