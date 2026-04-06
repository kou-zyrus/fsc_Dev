import { api } from 'lwc';
import LightningModal from 'lightning/modal';
import getEditSetupData from '@salesforce/apex/CKS_CTRL_DataMigrationRequest.getEditSetupData';

/**
 * LWC Modal for creating/editing/copying DataMigrationRequest__c records
 * Can be used:
 * 1. As a modal window from parent components
 * 2. As a Quick Action in Lightning Experience list views
 */
export async function openCreateModal(recordId = null, isCopy = false) {
    const result = await LightningModal.open({
        label: isCopy ? 'データ移行依頼コピー作成' : 'データ移行依頼新規作成',
        description: 'DataMigrationRequest__c record creation/edit',
        componentParams: {
            isCreate: !recordId || isCopy,
            isCopy: isCopy,
            recordId: recordId
        }
    });
    return result;
}

const TYPE_INTEGRATION_USED = '代理店統合(利用済み代理店間)';
const TYPE_INTEGRATION_UNUSED = '代理店統合(未利用代理店→利用済み代理店)';
const TYPE_NEW_USE = '販管から新規利用';
const TYPE_SPECIFICDATA_EXPORT = '一部データ抽出';
const TYPE_OTHER_PATCH = 'その他データパッチ';

const FIELD_VISIBILITY = {
    migrationAssociateCode: [TYPE_INTEGRATION_USED, TYPE_INTEGRATION_UNUSED],
    existingContractCustomerNotes: [TYPE_NEW_USE, TYPE_INTEGRATION_USED, TYPE_INTEGRATION_UNUSED, TYPE_SPECIFICDATA_EXPORT, TYPE_OTHER_PATCH],
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
    targetManagement: [TYPE_INTEGRATION_USED, TYPE_SPECIFICDATA_EXPORT, TYPE_OTHER_PATCH]
};

export default class CksDataMigrationRequestRecordCreateEdit extends LightningModal {
    @api isCreate = false;
    @api isCopy = false;
    @api recordId = null;
    @api launchContext = '';

    isLoading = false;
    isSaving = false;
    activeSections = ['A', 'B'];
    error;

    migrationType;
    copySourceData;

    connectedCallback() {
        this.init();
    }

    async init() {
        if (!this.recordId) {
            return;
        }

        this.isLoading = true;
        try {
            const data = await getEditSetupData({ recordId: this.recordId });
            this.migrationType = data?.MigrationType__c;

            if (this.isCopy) {
                this.copySourceData = data;
            }
        } catch (error) {
            this.error = error;
        } finally {
            this.isLoading = false;
        }
    }

    get disabled() {
        return this.isSaving;
    }

    get formRecordId() {
        return this.isCreate ? null : this.recordId;
    }

    get headerLabel() {
        if (this.isCopy) {
            return 'データ移行依頼コピー作成';
        }
        return this.isCreate ? 'データ移行依頼新規作成' : 'データ移行依頼編集';
    }

    get fieldValues() {
        if (this.isCopy && this.copySourceData) {
            const s = this.copySourceData;
            return {
                Name: s.Name,
                MigrationType__c: s.MigrationType__c,
                MigrationDate__c: s.MigrationDate__c,
                AssociateCode__c: s.AssociateCode__c,
                MigrationAssociateCode__c: s.MigrationAssociateCode__c,
                ExistingContractCustomerNotes__c: s.ExistingContractCustomerNotes__c,
                Individual__c: s.Individual__c,
                ChildGroup__c: s.ChildGroup__c,
                Household__c: s.Household__c,
                Relative__c: s.Relative__c,
                Campaign__c: s.Campaign__c,
                CampaignMember__c: s.CampaignMember__c,
                OtherCompany__c: s.OtherCompany__c,
                RiderOtherCompany__c: s.RiderOtherCompany__c,
                Opportunity__c: s.Opportunity__c,
                GraspIntention__c: s.GraspIntention__c,
                PersonalInformationHandling__c: s.PersonalInformationHandling__c,
                DailyReport__c: s.DailyReport__c,
                Event__c: s.Event__c,
                Task__c: s.Task__c,
                AttachmentDoc__c: s.AttachmentDoc__c,
                TargetManagement__c: s.TargetManagement__c
            };
        }
        if (this.isCreate && !this.isCopy) {
            return {
                ExistingContractCustomerNotes__c: true,
                Individual__c: true,
                ChildGroup__c: true,
                Household__c: true,
                Relative__c: true,
                Campaign__c: true,
                CampaignMember__c: true,
                OtherCompany__c: true,
                RiderOtherCompany__c: true,
                Opportunity__c: true,
                GraspIntention__c: true,
                PersonalInformationHandling__c: true,
                DailyReport__c: true,
                Event__c: true,
                Task__c: true,
                AttachmentDoc__c: true,
                TargetManagement__c: true
            };
        }
        // 編集モード: LDS が値をロードするため undefined を返す
        return {};
    }

    get visibility() {
        const visObj = {};
        Object.keys(FIELD_VISIBILITY).forEach((key) => {
            visObj[key] = FIELD_VISIBILITY[key].includes(this.migrationType);
        });
        return visObj;
    }

    get hasVisibleTargetFields() {
        return Object.values(this.visibility).some(Boolean);
    }

    get modalContentClass() {
        if (this.isCreate && !this.isCopy && !this.hasVisibleTargetFields) {
            return 'modal-content modal-content_empty-targets';
        }
        return 'modal-content';
    }

    get modalBodyClass() {
        if (this.isCreate && !this.isCopy && !this.hasVisibleTargetFields) {
            return 'modal-body modal-body_empty-targets';
        }
        return 'modal-body';
    }

    get showBlankRowsInSectionB() {
        return this.isCreate && !this.isCopy && !this.migrationType;
    }

    handleChange(event) {
        if (event.target.fieldName === 'MigrationType__c') {
            this.migrationType = event.target.value;
        }
    }

    handleClick(event) {
        if (event.target.name === 'cancel') {
            if (this.launchContext === 'listViewNew') {
                this.notifyListViewHost('cancel');
                return;
            }
            this.close({ status: 'cancel' });
        }
    }

    handleSubmit(event) {
        event.preventDefault();
        this.isSaving = true;

        const form = this.template.querySelector('lightning-record-edit-form');
        const fields = { ...event.detail.fields };

        if (this.isCopy && this.copySourceData) {
            Object.assign(fields, this.createCopyFields(), fields);
        }

        if (!this.isCreate) {
            fields.Id = this.recordId;
        }

        form.submit(fields);
    }

    handleSuccess(event) {
        const newRecordId = event.detail.id;

        if (this.launchContext === 'listViewNew') {
            this.notifyListViewHost('success', newRecordId);
            return;
        }

        if (this.isCopy && newRecordId) {
            window.location.assign(`/lightning/r/DataMigrationRequest__c/${newRecordId}/view`);
            return;
        }

        this.isSaving = false;
        this.close({
            isSuccess: true,
            status: 'success',
            recordId: newRecordId
        });
    }

    handleError(event) {
        this.isSaving = false;
        this.error = event.detail;
    }

    createCopyFields() {
        const src = this.copySourceData || {};
        return {
            MigrationType__c: src.MigrationType__c,
            MigrationDate__c: src.MigrationDate__c,
            AssociateCode__c: src.AssociateCode__c,
            MigrationAssociateCode__c: src.MigrationAssociateCode__c,
            ExistingContractCustomerNotes__c: src.ExistingContractCustomerNotes__c,
            Individual__c: src.Individual__c,
            ChildGroup__c: src.ChildGroup__c,
            Household__c: src.Household__c,
            Relative__c: src.Relative__c,
            Campaign__c: src.Campaign__c,
            CampaignMember__c: src.CampaignMember__c,
            OtherCompany__c: src.OtherCompany__c,
            RiderOtherCompany__c: src.RiderOtherCompany__c,
            Opportunity__c: src.Opportunity__c,
            GraspIntention__c: src.GraspIntention__c,
            PersonalInformationHandling__c: src.PersonalInformationHandling__c,
            DailyReport__c: src.DailyReport__c,
            Event__c: src.Event__c,
            Task__c: src.Task__c,
            AttachmentDoc__c: src.AttachmentDoc__c,
            TargetManagement__c: src.TargetManagement__c
        };
    }

    notifyListViewHost(status, recordId) {
        const url = status === 'success'
            ? `/lightning/r/DataMigrationRequest__c/${recordId}/view`
            : '/lightning/o/DataMigrationRequest__c/list';

        // sforce.one を window 自身および親フレームから探す（VF Lightning Out では window に存在）
        try {
            const frames = [window, window.parent, window.top];
            for (const f of frames) {
                if (f && f.sforce && f.sforce.one) {
                    f.sforce.one.navigateToURL(url);
                    return;
                }
            }
        } catch (e) {
            // クロスオリジンアクセス時は無視して次の手段へ
        }

        // postMessage: window 自身へ送信（VF ページのリスナーが同一ウィンドウで待機）
        const msg = { type: 'cksDataMigrationRequestCreateEditResult', status, recordId: recordId || null };
        try { window.postMessage(msg, '*'); } catch (e) {}
        try { window.parent.postMessage(msg, '*'); } catch (e) {}

        // 最終フォールバック
        try { window.top.location.assign(url); } catch (e) {}
        try { window.location.assign(url); } catch (e) {}
    }
}