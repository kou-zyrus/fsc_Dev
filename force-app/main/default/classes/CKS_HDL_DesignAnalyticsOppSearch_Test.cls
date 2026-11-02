/**
 * @description CKS_HDL_DesignAnalyticsOppSearch の単体テストクラス.
 */
@IsTest
public with sharing class CKS_HDL_DesignAnalyticsOppSearch_Test {
    
    private static User createdUser(final String firstName, final String lastName, final String profileName, final Contact c,final string roleType){

        Profile userProfile = [select id,name from Profile where name =: profileName];

        UserRole testUserRole = null;
        IF(roleType != null){
            testUserRole = [SELECT id FROM UserRole where PortalType =:roleType LIMIT 1];
        }

        return new User(
            email = 'test@aflac.co.jp',
            profileId = userProfile.Id,
            userRoleId = (roleType == null ? null : testUserRole.Id),
            UserName = 'analyticsopp' + firstName + '@aflac.co.jp',
            Alias = lastName.right(8),
            TimeZoneSidKey = 'Asia/Tokyo',
            EmailEncodingKey = 'UTF-8',
            LocaleSidKey = 'ja_JP',
            LanguageLocaleKey = 'ja',
            ContactId = (c == null ? null : c.Id),
            FirstName = firstName,
            LastName = lastName
        );
    }
    @TestSetup
    static void makeData(){
        
        //システム管理者挿入
        final User testAdmin = createdUser('systemuser', 'システム管理者A1','システム管理者',null,'NONE');
        insert testAdmin;

        system.runAs(testAdmin){

            //代理店挿入
            final Id agentAccountRecordTypeId = Schema.SObjectType.Account.getRecordTypeInfosByDeveloperName().get('AssociateGeneralAndAlliance').getRecordTypeId();

            List<Account> AssAgentList = new List<Account>();
            final Account testAssociate = new Account(name = '目標代理店_足利不動産',
                                          recordtypeId = agentAccountRecordTypeId,
                                          ownerId = testAdmin.id,
                                          AnalyticsIndividualCompanyHandling__c = '足利不動産株式会社',
                                          AssociateCode__c = '1234567');

            final Account testAssociate2 = new Account(name = '目標代理店_足利不動産2',
                                          recordtypeId = agentAccountRecordTypeId,
                                          ownerId = testAdmin.id,
                                          AnalyticsIndividualCompanyHandling__c = '足利不動産株式会社',
                                          AssociateCode__c = '1234568');
            //insert testAssociate;

            //出先挿入
            final Account testAgent = new Account(name = '出先_目標画面テスト用',
                                      recordtypeId = agentAccountRecordTypeId,
                                      ownerId = testAdmin.id,
                                      AssociateCode__c = '1234567',
                                      AgencyCode__c = '1234567001');
            final Account testAgent2 = new Account(name = '出先_目標画面テスト用2',
                                      recordtypeId = agentAccountRecordTypeId,
                                      ownerId = testAdmin.id,
                                      AssociateCode__c = '1234568',
                                      AgencyCode__c = '1234568001');
            //insert testAgent;
            AssAgentList.add(testAssociate);
            AssAgentList.add(testAssociate2);
            AssAgentList.add(testAgent);
            AssAgentList.add(testAgent2);

            insert AssAgentList;

            //取引先責任者挿入
            final Id contactRecordTypeId = Schema.SObjectType.Contact.getRecordTypeInfosByDeveloperName().get('Agent').getRecordTypeId();
            
            List<contact> conList = new List<contact>();
            Contact testExecutive = new Contact(FirstName = 'A1',
                                                LastName = '経営者',
                                                AccountId = testAssociate.Id,
                                                RecordTypeId = contactRecordTypeId,
                                                AssociateCode__c = '1234567',
                                                AgencyCode__c = '001');
            Contact testManager = new Contact(FirstName = 'A1',
                                              LastName = '出先管理者',
                                              AccountId = testAssociate.Id,
                                              RecordTypeId = contactRecordTypeId,
                                              AssociateCode__c = '1234567',
                                              AgencyCode__c = '001');
            Contact testWorker = new Contact(FirstName = 'A1',
                                             LastName = '募集人',
                                             AccountId = testAssociate.Id,
                                             RecordTypeId = contactRecordTypeId,
                                             AssociateCode__c = '1234567',
                                             AgencyCode__c = '001');

            Contact testExecutive2 = new Contact(FirstName = 'B1',
                                                LastName = '経営者',
                                                AccountId = testAssociate2.Id,
                                                RecordTypeId = contactRecordTypeId,
                                                AssociateCode__c = '1234568',
                                                AgencyCode__c = '001');
            conList.add(testExecutive);
            conList.add(testManager);
            conList.add(testWorker);
            conList.add(testExecutive2);
            Insert conList;

            //ユーザ挿入
            List<User> testUserList = new List<User>();
            User ExecutiveUser = createdUser('executiveuser', '代理店経営者','経営者_Member', testExecutive,null);
            User ManagerUser = createdUser('ManagerUser', '代理店出先管理者','出先管理者_Member', testManager,null);
            User Worker = createdUser('Worker', '代理店募集人','募集人_Member', testWorker,null);

            User ExecutiveUser2 = createdUser('executiveuser2', '代理店経営者','経営者_Member', testExecutive2,null);
            testUserList.add(ExecutiveUser);
            testUserList.add(ManagerUser);
            testUserList.add(Worker);
            testUserList.add(ExecutiveUser2);
            Insert testUserList;

            //設計書区分マスタ
            final Id division1RecordTypeId = Schema.SObjectType.CKS_DesignDocumentDivision__c.getRecordTypeInfosByDeveloperName().get('Division1').getRecordTypeId();
            final Id division2RecordTypeId = Schema.SObjectType.CKS_DesignDocumentDivision__c.getRecordTypeInfosByDeveloperName().get('Division2').getRecordTypeId();
            final Id division3RecordTypeId = Schema.SObjectType.CKS_DesignDocumentDivision__c.getRecordTypeInfosByDeveloperName().get('Division3').getRecordTypeId();

            List<CKS_DesignDocumentDivision__c> divisionList = new List<CKS_DesignDocumentDivision__c>();
         
            CKS_DesignDocumentDivision__c testDivision1 = new CKS_DesignDocumentDivision__c(
                Agency__c = testAssociate.id,
                Name = 'test保険料区分',
                DisplayName__c = 'test保険料区分',
                DisplayOrder__c = 1,
                OwnerId = ManagerUser.id,
                IsActive__c = true,
                recordTypeId = division1RecordTypeId
            );
            CKS_DesignDocumentDivision__c testDivision2 = new CKS_DesignDocumentDivision__c(
                Agency__c = testAssociate.id,
                Name = 'test契約区分',
                DisplayName__c = 'test契約区分',
                DisplayOrder__c = 1,
                OwnerId = ManagerUser.id,
                IsActive__c = true,
                recordTypeId = division2RecordTypeId
            );
            CKS_DesignDocumentDivision__c testDivision3 = new CKS_DesignDocumentDivision__c(
                Agency__c = testAssociate.id,
                Name = 'test手続区分',
                DisplayName__c = 'test手続区分',
                DisplayOrder__c = 1,
                OwnerId = ManagerUser.id,
                IsActive__c = true,
                recordTypeId = division3RecordTypeId
            );
            divisionList.add(testDivision1);
            divisionList.add(testDivision2);
            divisionList.add(testDivision3);
            insert divisionList;

            //Analytics共通データセット挿入
            final Id comdatasetRecordTypeId = Schema.SObjectType.AnalyticsCommonDataset__c.getRecordTypeInfosByDeveloperName().get('ProductMaster').getRecordTypeId();
            List<AnalyticsCommonDataset__c> testComDateSetList = new List<AnalyticsCommonDataset__c>();
            AnalyticsCommonDataset__c testComDateSet = new AnalyticsCommonDataset__c(
                RecordTypeId = comdatasetRecordTypeId,
                DesignDocument_ProductName_TrimSpaces__c = 'その他',
                DesignDocument_ProductName__c = 'その他',
                ownerId = ExecutiveUser.id,
                AKFProductCategory__c = 'がん',
                AKFProductCategoryOrder__c = '1',
                ProductCategory__c = 'がん',
                ProductCategoryOrder__c = '1'
            );

            AnalyticsCommonDataset__c testComDateSet2 = new AnalyticsCommonDataset__c(
                RecordTypeId = comdatasetRecordTypeId,
                DesignDocument_ProductName_TrimSpaces__c = 'REASON',
                DesignDocument_ProductName__c = 'REASON',
                ownerId = ManagerUser.id,
                AKFProductCategory__c = '医療',
                AKFProductCategoryOrder__c = '2',
                ProductCategory__c = '医療',
                ProductCategoryOrder__c = '2'
            );

            AnalyticsCommonDataset__c testComDateSet3 = new AnalyticsCommonDataset__c(
                RecordTypeId = comdatasetRecordTypeId,
                DesignDocument_ProductName_TrimSpaces__c = 'あんしんパレット',
                DesignDocument_ProductName__c = 'あんしんパレット',
                ownerId = ManagerUser.id,
                AKFProductCategory__c = '医療',
                AKFProductCategoryOrder__c = '2',
                ProductCategory__c = '医療',
                ProductCategoryOrder__c = '2'
            );

            testComDateSetList.add(testComDateSet);
            testComDateSetList.add(testComDateSet2);
            testComDateSetList.add(testComDateSet3);
            insert testComDateSetList;

            //Analyticsデータセット挿入
            final Id DepartmentInfoId = Schema.SObjectType.AnalyticsDataset__c.getRecordTypeInfosByDeveloperName().get('DepartmentInfo').getRecordTypeId();
            final Id UserInfoId = Schema.SObjectType.AnalyticsDataset__c.getRecordTypeInfosByDeveloperName().get('UserInfo').getRecordTypeId();
            List<AnalyticsDataset__c> testDateSetList = new List<AnalyticsDataset__c>();
            //募集人のAnalyticsデータセット
            AnalyticsDataset__c testDateSet = new AnalyticsDataset__c(
                RecordTypeId = UserInfoId,
                UserId__c = ExecutiveUser.id,
                ownerId = ExecutiveUser.id,
                AS_Branch_Name__c = 'Branch1',
                AS_Branch_Code_triple_digit__c = '001',
                AS_Code__c = '1234567',
                AS_AccountId__c = testAssociate.id
            );
            AnalyticsDataset__c testDateSet2 = new AnalyticsDataset__c(
                RecordTypeId = UserInfoId,
                UserId__c = ManagerUser.id,
                ownerId = ManagerUser.id,
                AS_Branch_Name__c = 'Branch1',
                AS_Branch_Code_triple_digit__c = '001',
                AS_Code__c = '1234567',
                AS_AccountId__c = testAssociate.id
            );
            //部署のAnalyticsデータセット
            AnalyticsDataset__c testDateSet3 = new AnalyticsDataset__c(
                RecordTypeId = DepartmentInfoId,
                DepartmentName__c = 'テスト部署',
                DepartmentCode__c = 'zrs001',
                AS_Branch_AccountId__c = testAgent.id,
                AS_AccountId__c = testAssociate.id
            );
            AnalyticsDataset__c testDateSet4 = new AnalyticsDataset__c(
                RecordTypeId = UserInfoId,
                UserId__c = ExecutiveUser2.id,
                ownerId = ExecutiveUser2.id,
                AS_Branch_Name__c = 'Branch1',
                AS_Branch_Code_triple_digit__c = '001',
                AS_Code__c = '12345678',
                AS_AccountId__c = testAssociate2.id
            );
            testDateSetList.add(testDateSet);
            testDateSetList.add(testDateSet2);
            testDateSetList.add(testDateSet3);
            testDateSetList.add(testDateSet4);
            insert testDateSetList;

            //商品手数料率
            List<ProductCommissionPercent__c> textProPerList = new List<ProductCommissionPercent__c>();

            ProductCommissionPercent__c testProPercent = new ProductCommissionPercent__c(
                AssociateName__c = testAssociate.id,
                ProductName__c = 'その他',
                CommissionPercent__c = 20,
                ownerId = ExecutiveUser.id
            );
            ProductCommissionPercent__c testProPercent2 = new ProductCommissionPercent__c(
                AssociateName__c = testAssociate.id,
                ProductName__c = 'その他',
                CommissionPercent__c = 20,
                ownerId = ExecutiveUser.id,
                CommissionStartDate__c = Date.today()
            );
            ProductCommissionPercent__c testProPercent3 = new ProductCommissionPercent__c(
                AssociateName__c = testAssociate.id,
                ProductName__c = 'その他',
                CommissionPercent__c = 20,
                ownerId = ExecutiveUser.id,
                CommissionEndDate__c  = Date.today()
            );
            ProductCommissionPercent__c testProPercent4 = new ProductCommissionPercent__c(
                AssociateName__c = testAssociate.id,
                ProductName__c = 'その他',
                CommissionPercent__c = 20,
                ownerId = ExecutiveUser.id,
                CommissionStartDate__c = Date.today(),
                CommissionEndDate__c  = Date.today().addMonths(1)
            );
            ProductCommissionPercent__c testProPercent5 = new ProductCommissionPercent__c(
                AssociateName__c = testAssociate.id,
                ProductName__c = 'REASON',
                CommissionPercent__c = 20,
                ownerId = ManagerUser.id
            );
            ProductCommissionPercent__c testProPercent6 = new ProductCommissionPercent__c(
                AssociateName__c = testAssociate.id,
                ProductName__c = 'REASON',
                CommissionPercent__c = 20,
                ownerId = ManagerUser.id,
                CommissionStartDate__c = Date.today()
            );
            ProductCommissionPercent__c testProPercent7 = new ProductCommissionPercent__c(
                AssociateName__c = testAssociate.id,
                ProductName__c = 'REASON',
                CommissionPercent__c = 20,
                ownerId = ManagerUser.id,
                CommissionEndDate__c  = Date.today()
            );
            ProductCommissionPercent__c testProPercent8 = new ProductCommissionPercent__c(
                AssociateName__c = testAssociate.id,
                ProductName__c = 'REASON',
                CommissionPercent__c = 20,
                ownerId = ManagerUser.id,
                CommissionStartDate__c = Date.today(),
                CommissionEndDate__c  = Date.today().addMonths(1)
            );
            textProPerList.add(testProPercent);
            textProPerList.add(testProPercent2);
            textProPerList.add(testProPercent3);
            textProPerList.add(testProPercent4);
            textProPerList.add(testProPercent5);
            textProPerList.add(testProPercent6);
            textProPerList.add(testProPercent7);
            textProPerList.add(testProPercent8);
            insert textProPerList;

            //account挿入
            final Id accountRecordTypeId = Schema.SObjectType.Account.getRecordTypeInfosByDeveloperName().get('Individual').getRecordTypeId();
            //団体
            final Id groupRecordTypeId = Schema.SObjectType.Account.getRecordTypeInfosByDeveloperName().get('ChildGroup').getRecordTypeId();
            List<Account> testAccList = new List<Account>();
            Account testAcc = new Account(FirstName = 'テスト',
                                            LastName = '白地1',
                                            RecordTypeId = accountRecordTypeId,
                                            ownerId = ExecutiveUser.id);
            Account testAcc2 = new Account(FirstName = 'テスト',
                                            LastName = '白地2',
                                            RecordTypeId = accountRecordTypeId,
                                            ownerId = ExecutiveUser2.id);

            Account testUpdateAcc = new Account(FirstName = 'テスト',
                                            LastName = '白地2',
                                            RecordTypeId = accountRecordTypeId,
                                            ownerId = ManagerUser.id);
            
            Account testGroup = new Account(
                RecordTypeId = groupRecordTypeId,
                name = 'testGroup',
                GroupHierarchy__c = '団体',
                GroupCode__c = '11111',
                OwnerId = ManagerUser.id
            );
            
            testAccList.add(testAcc);
            testAccList.add(testAcc2);
            testAccList.add(testUpdateAcc);
            testAccList.add(testGroup);
            
            insert testAccList;

            Account testGroup2 = new Account(
                RecordTypeId = groupRecordTypeId,
                name = 'testGroup2',
                GroupHierarchy__c = '第2階層',
                GroupCode__c = '11112',
                OwnerId = ManagerUser.id,
                ParentGroup__c = testGroup.Id
            );
            insert testGroup2;

            //顧客注意事項
            List<CustomerNotes__c> testNotesList = new List<CustomerNotes__c>();
            CustomerNotes__c testNotes = new CustomerNotes__c(
                PersonAccount__c = testAcc.id,
                OwnerId = ExecutiveUser.id
            );
            CustomerNotes__c testNotes2 = new CustomerNotes__c(
                PersonAccount__c = testAcc2.id,
                OwnerId = ExecutiveUser2.id
            );

            testNotesList.add(testNotes);
            testNotesList.add(testNotes2);
            insert testNotesList;

            //案件挿入
            final Id oppRecordTypeId = Schema.SObjectType.Opportunity.getRecordTypeInfosByDeveloperName().get('Opportunity').getRecordTypeId();

            List<Opportunity> oppList = new List<Opportunity>();

            Opportunity testOpp = new Opportunity(name = 'testOpp',
                                                    AccountId = testAcc.id,
                                                    RecordTypeId = oppRecordTypeId,
                                                    OwnerId = ExecutiveUser.id,
                                                    StaffInChargOperate__c = ExecutiveUser.id,
                                                    StageName = '未割当',
                                                    CloseDate = Date.today(),
                                                    OwnerDepartment__c = 'テスト部署',
                                                    OwnerBranch__c = testAgent.id
                                                    );

            Opportunity testUpdateOpp = new Opportunity(name = 'testUpdateOpp',
                                                        AccountId = testUpdateAcc.id,
                                                        RecordTypeId = oppRecordTypeId,
                                                        OwnerId = ManagerUser.id,
                                                        StaffInChargOperate__c = ManagerUser.id,
                                                        StageName = '未割当',
                                                        CloseDate = Date.today(),
                                                        OwnerDepartment__c = 'テスト部署',
                                                        OwnerBranch__c = testAgent.id
                                                        );
            Opportunity testOpp2 = new Opportunity(name = 'testOpp2',
                                                        AccountId = testAcc2.id,
                                                        RecordTypeId = oppRecordTypeId,
                                                        OwnerId = ExecutiveUser2.id,
                                                        StaffInChargOperate__c = ExecutiveUser2.id,
                                                        StageName = '未割当',
                                                        CloseDate = Date.today(),
                                                        OwnerDepartment__c = 'テスト部署2',
                                                        OwnerBranch__c = testAgent2.id
                                                        );
            
            oppList.add(testOpp);
            oppList.add(testUpdateOpp);
            oppList.add(testOpp2);
            Test.startTest();
            insert oppList;

            //設計書挿入
            DesignDocument__c testUpdateDoc = new DesignDocument__c(
                Opportunity__c = testUpdateOpp.id,
                Insured__c='顧客1',
                InsuredAge__c='30',
                ProductName__c = 'その他',
                InsuranceProductCompany__c = 'Aflac'
            );
            
            insert testUpdateDoc;
            Test.stopTest();
        }
    }

    @IsTest(seeAllData=false)
    static void testInsertDoc() {

        User ExecutiveUser = [select id,name from user where username= 'analyticsoppexecutiveuser@aflac.co.jp'];
        User ManagerUser = [select id,name from user where username= 'analyticsoppmanageruser@aflac.co.jp'];
        
        system.runAs(ExecutiveUser){
            
            Test.startTest();
            Opportunity testOpp = [SELECT id,name,ownerId,AssociateCode__c FROM Opportunity WHERE name = 'testOpp' LIMIT 1];

            //設計書挿入
            DesignDocument__c testDoc = new DesignDocument__c(
                Opportunity__c = testOpp.id,
                Insured__c='顧客1',
                InsuredAge__c='30',
                ProductName__c = 'あんしんパレット',
                InsuranceProductCompany__c = 'Aflac'
            );
            insert testDoc;
            DesignDocument__c testDoc2 = new DesignDocument__c(
                Opportunity__c = testOpp.id,
                Insured__c='顧客1',
                InsuredAge__c='30',
                ProductName__c = 'その他',
                InsuranceProductCompany__c = 'Aflac'
            );

            insert testDoc2;
        
            testOpp.OwnerId = ManagerUser.Id;
            testOpp.StaffInChargOperate__c = ManagerUser.Id;
            testOpp.OwnerIdUpdater__c = ManagerUser.Id;
            update testOpp;
            Test.stopTest();
        }

        system.runAs(ManagerUser){
            DesignDocument__c testDoc = [SELECT id,name,ProductName__c FROM DesignDocument__c WHERE Opportunity__r.name = 'testOpp' LIMIT 1];
            testDoc.ProductName__c = 'REASON';
            
            update testDoc;
        }
    }
    
    @IsTest
    static void testUpdatgeDoc() {

        User ManagerUser = [select id,name from user where username= 'analyticsoppmanageruser@aflac.co.jp'];
        Account testGroup = [SELECT id,name FROM Account WHERE name = 'testGroup' LIMIT 1];
        Account testGroup2 = [SELECT id,name FROM Account WHERE name = 'testGroup2' LIMIT 1];
        
        CKS_DesignDocumentDivision__c division1 = [SELECT id,name FROM CKS_DesignDocumentDivision__c WHERE name = 'test保険料区分' LIMIT 1];
        CKS_DesignDocumentDivision__c division2 = [SELECT id,name FROM CKS_DesignDocumentDivision__c WHERE name = 'test契約区分' LIMIT 1];
        CKS_DesignDocumentDivision__c division3 = [SELECT id,name FROM CKS_DesignDocumentDivision__c WHERE name = 'test手続区分' LIMIT 1];

        Test.startTest();
        system.runAs(ManagerUser){

            Opportunity opp = [SELECT id,name,ownerId,AssociateCode__c FROM Opportunity WHERE name = 'testUpdateOpp' LIMIT 1];

            DesignDocument__c testDoc = new DesignDocument__c(
                Opportunity__c = opp.id,
                Insured__c='顧客1',
                InsuredAge__c='30',
                ProductName__c = 'その他',
                InsuranceProductCompany__c = 'Aflac'
            );
            insert testDoc;

            testDoc.ProductName__c = 'REASON';
            testDoc.Group__c = testGroup.id;
            testDoc.GroupSecond__c = testGroup2.id;
            testDoc.Insurance_fee_division__c = division1.id;
            testDoc.Contract_division__c = division2.id;
            testDoc.Routine_division__c = division3.id;

            update testDoc;
            Test.stopTest();
        }
    }

    @IsTest
    static void testErrorEmail() {

        User ManagerUser = [select id,name from user where username= 'analyticsoppmanageruser@aflac.co.jp'];
        
        Test.startTest();
        system.runAs(ManagerUser){

            Opportunity opp = [SELECT id,name,ownerId,OwnerFullName__c FROM Opportunity WHERE name = 'testUpdateOpp' LIMIT 1];
            
            DesignDocument__c testDoc = new DesignDocument__c(
                Opportunity__c = opp.id,
                Insured__c='顧客1',
                InsuredAge__c='30',
                ProductName__c = 'その他',
                InsuranceProductCompany__c = 'Aflac'
            );
            insert testDoc;

            List<DesignDocument__c> testDocList = new List<DesignDocument__c>();
            testDocList.add(testDoc);

            CKS_HDL_DesignAnalyticsOppSearch.sendErrorEmail('テストエラー',testDocList);
        }
        Test.stopTest();
    }

    @IsTest
    static void testInsertCatchError() {

        User ManagerUser = [select id,name from user where username= 'analyticsoppmanageruser@aflac.co.jp'];

        Test.startTest();
        system.runAs(ManagerUser){

            Opportunity opp = [SELECT id,name,ownerId,AssociateCode__c FROM Opportunity WHERE name = 'testUpdateOpp' LIMIT 1];

            DesignDocument__c testDoc = new DesignDocument__c(
                Opportunity__c = opp.id,
                Insured__c='顧客1',
                InsuredAge__c='30',
                ProductName__c = 'その他',
                InsuranceProductCompany__c = 'Aflac'
            );

            CKS_HDL_DesignAnalyticsOppSearch.isTestForceError = true;

            try{
                insert testDoc;
            }catch(AuraHandledException e){
                // テスト時はエラーを発生させる
            }finally{
                CKS_HDL_DesignAnalyticsOppSearch.isTestForceError = false;
            }
            
            Test.stopTest();
        }
    }

    @IsTest
    static void testUpdateCatchError() {

        User ManagerUser = [select id,name from user where username= 'analyticsoppmanageruser@aflac.co.jp'];

        Account testGroup = [SELECT id,name FROM Account WHERE name = 'testGroup' LIMIT 1];
        Account testGroup2 = [SELECT id,name FROM Account WHERE name = 'testGroup2' LIMIT 1];

        CKS_DesignDocumentDivision__c division1 = [SELECT id,name FROM CKS_DesignDocumentDivision__c WHERE name = 'test保険料区分' LIMIT 1];
        CKS_DesignDocumentDivision__c division2 = [SELECT id,name FROM CKS_DesignDocumentDivision__c WHERE name = 'test契約区分' LIMIT 1];
        CKS_DesignDocumentDivision__c division3 = [SELECT id,name FROM CKS_DesignDocumentDivision__c WHERE name = 'test手続区分' LIMIT 1];

        Test.startTest();
        system.runAs(ManagerUser){

            Opportunity opp = [SELECT id,name,ownerId,AssociateCode__c FROM Opportunity WHERE name = 'testUpdateOpp' LIMIT 1];

            DesignDocument__c testDoc = new DesignDocument__c(
                Opportunity__c = opp.id,
                Insured__c='顧客1',
                InsuredAge__c='30',
                ProductName__c = 'その他',
                InsuranceProductCompany__c = 'Aflac'
            );

            insert testDoc;

            testDoc.ProductName__c = 'REASON';
            testDoc.Group__c = testGroup.id;
            testDoc.GroupSecond__c = testGroup2.id;
            testDoc.Insurance_fee_division__c = division1.id;
            testDoc.Contract_division__c = division2.id;
            testDoc.Routine_division__c = division3.id;

            CKS_HDL_DesignAnalyticsOppSearch.isTestForceError = true;
            
            try{
                update testDoc;
            }catch(AuraHandledException e){
                // テスト時はエラーを発生させる
            }finally{
                CKS_HDL_DesignAnalyticsOppSearch.isTestForceError = false;
            }

            Test.stopTest();
        }
    }

    @IsTest
    static void testNoProductCommissionPercent() {

        User ExecutiveUser2 = [select id,name from user where username= 'analyticsoppexecutiveuser2@aflac.co.jp'];

        Test.startTest();
        system.runAs(ExecutiveUser2){

            Opportunity opp2 = [SELECT id,name,ownerId,AssociateCode__c FROM Opportunity WHERE name = 'testOpp2' LIMIT 1];

            DesignDocument__c testDoc2 = new DesignDocument__c(
                Opportunity__c = opp2.id,
                Insured__c='顧客1',
                InsuredAge__c='30',
                ProductName__c = 'その他',
                InsuranceProductCompany__c = 'Aflac'
            );

            insert testDoc2;
            
            Test.stopTest();
        }    
    }
}