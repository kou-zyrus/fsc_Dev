import { LightningElement, api, track, wire } from "lwc";
import { updateSchedule,getDataConnectors,getDataflows,getRecipes } from "lightning/analyticsWaveApi";
import createDataset from "@salesforce/apex/CreateDataset.createDataset";
import createMockUser from "@salesforce/apex/CreateDataset.createMockUser";
import scheduleBatch from "@salesforce/apex/CreateDataset.scheduleBatch";
import getStringUserProfileId from "@salesforce/apex/CreateDataset.getStringUserProfileId";
import createNewOpportunityForAnalytics from "@salesforce/apex/CreateDataset.createNewOpportunityForAnalytics";

export default class analyticsRetrofit extends LightningElement {

  //接続名・接続IDを表示
  @api resultConnectArray
  @api connectColumns
  @wire(getDataConnectors, {
      connectortype: ["SFDC_LOCAL"],
    })
     onGetDataConnectors({data, error}) {
      if (error) {
        console.log("getDataConnectors ERROR:", error);
      } else if (data) {
        console.log("getDataConnectors RESPONSE:", data.dataConnectors);
        //ライトニングテーブルのカラムを作成
        this.connectColumns = [{label: 'ラベル名',fieldName: 'Label'},{label: 'ID',fieldName: 'Id'}];
        //接続名・接続IDの配列を作成
        let tableDisplayConnectLabel = [];
        let tableDisplayConnectId = [];
        if(data.dataConnectors !== null){
          for(let i = 0; i < data.dataConnectors.length; i++){
            if(data.dataConnectors[i]===undefined){
              break;
            }
            tableDisplayConnectLabel.push(data.dataConnectors[i].label);
            tableDisplayConnectId.push(data.dataConnectors[i].id);
            }
        console.log("ラベル表示",tableDisplayConnectLabel);
        console.log("Id表示",tableDisplayConnectId);
        } else {
          console.log("エラー");
        }
        this.resultConnectArray = this.combineArrays(tableDisplayConnectLabel,tableDisplayConnectId);
        console.log(this.resultConnectArray);
      }
    } 
    
    //レシピ名・レシピIDを表示
    @api resultRecipeArray
    @api recipeColumns
    @wire(getRecipes, {
      licenseType: "EinsteinAnalytics",
    })
    onGetRecipes({data, error}) {
      if (error) {
        console.log("getRecipes ERROR:", error);
      } else if (data) {
        console.log("getRecipes RESPONSE:", data.recipes);
        //ライトニングテーブルのカラムを作成
        this.recipeColumns = [{label: 'ラベル名',fieldName: 'Label'},{label: 'ID',fieldName: 'Id'}];
        //レシピ名・レシピIDの配列を作成
        let tableDisplayRecipeLabel = [];
        let tableDisplayRecipeId = [];
        if(data.recipes !== null){
          for(let i = 0; i < data.recipes.length; i++){
            if(data.recipes[i]===undefined){
              break;
            }
              tableDisplayRecipeLabel.push(data.recipes[i].label);
              tableDisplayRecipeId.push(data.recipes[i].id);
            }
        console.log("ラベル表示",tableDisplayRecipeLabel);
        console.log("Id表示",tableDisplayRecipeId);
        } else {
          console.log("エラー");
        }
        this.resultRecipeArray = this.combineArrays(tableDisplayRecipeLabel,tableDisplayRecipeId);
      }
    }

    //データフロー名・データフローIDを表示
    @api resultDataFlowArray
    @api flowColumns
    @wire(getDataflows)
    onGetDataflows({ data, error }) {
      if (error) {
        console.log("getDataflows ERROR:", error);
      } else if (data) {
        console.log("getDataflows RESPONSE:", data.dataflows);
        //ライトニングテーブルのカラムを作成
        this.flowColumns = [{label: 'ラベル名',fieldName: 'Label'},{label: 'ID',fieldName: 'Id'}];
        //データフロー名・データフローIDの配列を作成
        let tableDisplayDataFlowLabel = [];
        let tableDisplayDataFlowId = [];
        if(data.dataflows !== null){
          for(let i = 0; i < data.dataflows.length; i++){
            if(data.dataflows[i]===undefined){
              break;
            }
            tableDisplayDataFlowLabel.push(data.dataflows[i].label);
            tableDisplayDataFlowId.push(data.dataflows[i].id);
            }
        console.log("ラベル表示",tableDisplayDataFlowLabel);
        console.log("Id表示",tableDisplayDataFlowId);
        } else {
          console.log("エラー");
        }
        this.resultDataFlowArray = this.combineArrays(tableDisplayDataFlowLabel,tableDisplayDataFlowId);
      }
    }

    //レシピ・データフロースケジュール設定
    @track isRecipeDataflowScheduleProcessing =false;
    async executRecipeDataflowSchedule() {
      if(this.isNotAdmin == false){
        try{
          this.isRecipeDataflowScheduleProcessing = true ;
          await this.schedule();
        }catch(e){
          alert(e);
        }
      }else{
      alert("システム管理者以外では実行できません");
      }    
      this.isRecipeDataflowScheduleProcessing = false ;  
    }

    // モックユーザ作成
    @track isCreateUserProcessing = false;
    async executeCreateMockUser() {
      if(this.isNotAdmin == false){
        try{
          this.isCreateUserProcessing = true ;
          const message = await createMockUser();
          alert(message);
        }catch(e){
          alert(e.body.message);
        }
      }else{
      alert("システム管理者以外では実行できません");
      }    
      this.isCreateUserProcessing = false ;  
    }

    //案件検索バッチスケジュールボタン用の関数を定義
    async executeScheduleBatch() {
      if(this.isNotAdmin == false){
        scheduleBatch()
        .then((message) => {
          alert(message);
        })
        .catch(error => {
          alert(error.body.message);
        })
      }else{
      alert("システム管理者以外では実行できません");
      }
    }
    
  //データセット作成ボタン用の関数を定義
  @track isCreateDatasetProcessing = false;
  async executeCreateDataset(){
    if(this.isNotAdmin == false){
      if(confirm("cam09及びzrsdev3では推奨されません。実行しますか?")){
        try{
          this.isCreateDatasetProcessing = true ;
          await Promise.resolve();
          alert("データセット作成開始。データマネージャを確認してください。\n※クラスの文字数制限のため、正確な表示が必要な際は100Years及び商品マスタを手動でデプロイしてください\n実行中はボタンが非活性になります");
          await createDataset();
        }catch(e){
          alert(e.body.fieldErrors.EdgemartContainer[0].message);
        }
      }else{
        alert("実行されませんでした");
      }
    }else{
      alert("システム管理者以外では実行できません");
    }
    this.isCreateDatasetProcessing = false ;
  }

  //スケジュールで指定したIDが存在しているか確認
  async idErrorCheck(){
  //接続のラベルをハードコード
    let nowDataConnectArray = [
      'SFDC_LOCAL',
      'SFDC_LOCAL_CAMPS_Hourly_8am-10pm',
      'SFDC_LOCAL_CAMPS_Daily_6am',
      'SFDC_LOCAL_CAMPS_Hourly_6am-10pm',
      'SFDC_LOCAL_CAMPS-dashboard',
      'SFDC_LOCAL_CAMPS_Daily_3:30am'
    ];
    //レシピのラベルをハードコード
    let nowRecipeArray = [
      '【CAMPS】1時間毎実行',
      '【CAMPS-ダッシュボード】アプローチリストの集計',
      '【CAMPSログイン回数】Loginの時間の変換とログイン回数の集計',
      '【CAMPS活動量管理表】案件・設計書と対応の量的集計',
      '【CAMPS】案件検索バッチ用CSV作成'
    ];
    //データフローのラベルをハードコード
    let nowDataFlowArray = [
      '【CAMPS募集人情報】ユーザ、取引先、取引先責任者の募集人に関する情報の統合',
      '【CAMPS挙績と目標】挙績DS、目標、商品マスタの統合',
      '【CAMPS案件プロセス遷移率】商談とベンチマークの統合',
      '【CAMPS活動リスト】社員向けTODOレコード処理',
      '【CAMPS見込ランク】商談の見込度と募集人情報の統合',
      '【CAMPS証券発送プロセス遷移率】証券発送のプロセス遷移率計算',
      'イベントログモニタリング eltDataflow'
    ];
      
    let idCheckArray = [];
    //ハードコードされた接続の存在有無を確認
    for(let i = 0; i < nowDataConnectArray.length; i++){
        try {
          this.resultConnectArray[this.findId(this.resultConnectArray,nowDataConnectArray[i])].Id
        } catch (error) {
          //存在しなければ配列に追加
          idCheckArray.push(nowDataConnectArray[i]);
        }
      }
    //ハードコードされたレシピの存在有無を確認
    for(let i = 0; i < nowRecipeArray.length; i++){
      try {
        this.resultRecipeArray[this.findId(this.resultRecipeArray,nowRecipeArray[i])].Id
      } catch (error) {
        //存在しなければ配列に追加
        idCheckArray.push(nowRecipeArray[i]);
      }
    }
    //ハードコードされたデータフローの存在有無を確認
    for(let i = 0; i < nowDataFlowArray.length; i++){
      try {
        this.resultDataFlowArray[this.findId(this.resultDataFlowArray,nowDataFlowArray[i])].Id
      } catch (error) {
        //存在しなければ配列に追加
        idCheckArray.push(nowDataFlowArray[i]);
      }
    }

    if(idCheckArray.length == 0){
      alert("すべてのIDが存在しています");
    }else{
      const errorMessage = idCheckArray.join('\n');
      alert("以下接続・レシピ・データフローが存在していません\n"
        + errorMessage
      );
    }
  }

  //案件作成ボタン
  @track isCreateOpportunityProcessing = false;
    async executeCreateOpportunity() {
      if(this.isNotAdmin == false){
        try{
          this.isCreateOpportunityProcessing = true ;
          const message = await createNewOpportunityForAnalytics();
          alert(message);
        }catch(e){
          alert(e.body.message);
        }
      }else{
      alert("システム管理者以外では実行できません");
      }    
      this.isCreateOpportunityProcessing = false ;  
    }

  //接続・レシピ・データフローのスケジュールを管理
  @api assetId; // or fetch the ID of the asset
  async schedule() {
      // オブジェクトの配列の初期化
      const schedules = [
        {
          setAssetId: this.resultConnectArray[this.findId(this.resultConnectArray,'SFDC_LOCAL')].Id,
          label:'SFDC_LOCAL',

          setSchedule: {
            daysOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
            time: {
              hour: 0,
              minute: 0,
              timeZone: "Asia/Tokyo",
            },
            frequency: "weekly",
            notificationLevel: "Never"
          }
        },
        {
          setAssetId: this.resultConnectArray[this.findId(this.resultConnectArray,'SFDC_LOCAL_CAMPS_Hourly_8am-10pm')].Id,
          label:'SFDC_LOCAL_CAMPS_Hourly_8am-10pm',

          setSchedule: {
            daysOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
            lastHour: 23,
            hourlyInterval: 1,
            time: {
              hour: 8,
              minute: 0,
              timeZone: "Asia/Tokyo",
            },
            frequency: "hourly",
            notificationLevel: "Never"
          }
        },
        {
          setAssetId: this.resultConnectArray[this.findId(this.resultConnectArray,'SFDC_LOCAL_CAMPS_Daily_6am')].Id,
          label:'SFDC_LOCAL_CAMPS_Daily_6am',

          setSchedule: {
            daysOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
            time: {
              hour: 6,
              minute: 0,
              timeZone: "Asia/Tokyo",
            },
            frequency: "weekly",
            notificationLevel: "Never"
          }
        },
        {
          setAssetId: this.resultConnectArray[this.findId(this.resultConnectArray,'SFDC_LOCAL_CAMPS_Hourly_6am-10pm')].Id,
          label:'SFDC_LOCAL_CAMPS_Hourly_6am-10pm',

          setSchedule: {
            daysOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
            lastHour: 23,
            hourlyInterval: 1,
            time: {
              hour: 6,
              minute: 0,
              timeZone: "Asia/Tokyo",
            },
            frequency: "hourly",
            notificationLevel: "Never"
          }
        },
        {
          setAssetId: this.resultConnectArray[this.findId(this.resultConnectArray,'SFDC_LOCAL_CAMPS-dashboard')].Id,
          label:'SFDC_LOCAL_CAMPS-dashboard',

          setSchedule: {
            daysOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
            lastHour: 14,
            hourlyInterval: 6,
            time: {
              hour: 6,
              minute: 30,
              timeZone: "Asia/Tokyo",
            },
            frequency: "hourly",
            notificationLevel: "Never"
          }
        },
        {
          setAssetId: this.resultConnectArray[this.findId(this.resultConnectArray,'SFDC_LOCAL_CAMPS_Daily_3:30am')].Id,
          label:'SFDC_LOCAL_CAMPS_Daily_3:30am',

          setSchedule: {
            daysOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
            time: {
              hour: 3,
              minute: 30,
              timeZone: "Asia/Tokyo",
            },
            frequency: "weekly",
            notificationLevel: "Never"
          }
        },
        {
          setAssetId: this.resultRecipeArray[this.findId(this.resultRecipeArray,'【CAMPS】1時間毎実行')].Id,
          label:'【CAMPS】1時間毎実行',

          setSchedule: {
            daysOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
            lastHour: 23,
            hourlyInterval: 1,
            time: {
              hour: 8,
              minute: 0,
              timeZone: "Asia/Tokyo",
            },
            frequency: "hourly",
            notificationLevel: "Never"
          }
        },
        {
          setAssetId: this.resultRecipeArray[this.findId(this.resultRecipeArray,'【CAMPS-ダッシュボード】アプローチリストの集計')].Id,
          label:'【CAMPS-ダッシュボード】アプローチリストの集計',

          setSchedule: {
            daysOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
            lastHour: 15,
            hourlyInterval: 6,
            time: {
              hour: 7,
              minute: 30,
              timeZone: "Asia/Tokyo",
            },
            frequency: "hourly",
            notificationLevel: "Never"
          }
        },
        {
          setAssetId: this.resultRecipeArray[this.findId(this.resultRecipeArray,'【CAMPS-ダッシュボード】MC連携用外部出力')].Id,
          label:'【CAMPS-ダッシュボード】MC連携用外部出力',

          setSchedule: {
            daysOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
            time: {
              hour: 10,
              minute: 30,
              timeZone: "Asia/Tokyo",
            },
            frequency: "weekly",
            notificationLevel: "Never"
          }
        },
        {
          setAssetId: this.resultRecipeArray[this.findId(this.resultRecipeArray,'【CAMPSログイン回数】Loginの時間の変換とログイン回数の集計')].Id,
          label:'【CAMPSログイン回数】Loginの時間の変換とログイン回数の集計',

          setSchedule: {
            daysOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
            time: {
              hour: 6,
              minute: 0,
              timeZone: "Asia/Tokyo",
            },
            frequency: "weekly",
            notificationLevel: "Never"
          }
        },
        {
          setAssetId: this.resultRecipeArray[this.findId(this.resultRecipeArray,'【CAMPS活動量管理表】案件・設計書と対応の量的集計')].Id,
          label:'【CAMPS活動量管理表】案件・設計書と対応の量的集計',

          setSchedule: {
            daysOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
            time: {
              hour: 1,
              minute: 30,
              timeZone: "Asia/Tokyo",
            },
            frequency: "weekly",
            notificationLevel: "Never"
          }
        },
        {
          setAssetId: this.resultDataFlowArray[this.findId(this.resultDataFlowArray,'【CAMPS募集人情報】ユーザ、取引先、取引先責任者の募集人に関する情報の統合')].Id,
          label:'【CAMPS募集人情報】ユーザ、取引先、取引先責任者の募集人に関する情報の統合',

          setSchedule: {
            daysOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
            time: {
              hour: 1,
              minute: 0,
              timeZone: "Asia/Tokyo",
            },
            frequency: "weekly",
            notificationLevel: "Never"
          }
        },
        {
          setAssetId: this.resultDataFlowArray[this.findId(this.resultDataFlowArray,'【CAMPS挙績と目標】挙績DS、目標、商品マスタの統合')].Id,
          label:'【CAMPS挙績と目標】挙績DS、目標、商品マスタの統合',

          setSchedule: {
            daysOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
            time: {
              hour: 2,
              minute: 30,
              timeZone: "Asia/Tokyo",
            },
            frequency: "weekly",
            notificationLevel: "Never"
          }
        },
        {
          setAssetId: this.resultDataFlowArray[this.findId(this.resultDataFlowArray,'【CAMPS案件プロセス遷移率】商談とベンチマークの統合')].Id,
          label:'【CAMPS案件プロセス遷移率】商談とベンチマークの統合',

          setSchedule: {
            daysOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
            time: {
              hour: 2,
              minute: 30,
              timeZone: "Asia/Tokyo",
            },
            frequency: "weekly",
            notificationLevel: "Never"
          }
        },
        {
          setAssetId: this.resultDataFlowArray[this.findId(this.resultDataFlowArray,'【CAMPS活動リスト】社員向けTODOレコード処理')].Id,
          label:'【CAMPS活動リスト】社員向けTODOレコード処理',

          setSchedule: {
            daysOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
            time: {
              hour: 2,
              minute: 30,
              timeZone: "Asia/Tokyo",
            },
            frequency: "weekly",
            notificationLevel: "Never"
          }
        },
        {
          setAssetId: this.resultDataFlowArray[this.findId(this.resultDataFlowArray,'【CAMPS見込ランク】商談の見込度と募集人情報の統合')].Id,
          label:'【CAMPS見込ランク】商談の見込度と募集人情報の統合',

          setSchedule: {
            daysOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
            time: {
              hour: 2,
              minute: 30,
              timeZone: "Asia/Tokyo",
            },
            frequency: "weekly",
            notificationLevel: "Never"
          }
        },
        {
          setAssetId: this.resultDataFlowArray[this.findId(this.resultDataFlowArray,'【CAMPS証券発送プロセス遷移率】証券発送のプロセス遷移率計算')].Id,
          label:'【CAMPS証券発送プロセス遷移率】証券発送のプロセス遷移率計算',

          setSchedule: {
            daysOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
            time: {
              hour: 2,
              minute: 30,
              timeZone: "Asia/Tokyo",
            },
            frequency: "weekly",
            notificationLevel: "Never"
          }
        },
        {
          setAssetId: this.resultDataFlowArray[this.findId(this.resultDataFlowArray,'イベントログモニタリング eltDataflow')].Id,
          label:'イベントログモニタリング eltDataflow',

          setSchedule: {
            daysOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
            time: {
              hour: 5,
              minute: 0,
              timeZone: "Asia/Tokyo",
            },
            frequency: "weekly",
            notificationLevel: "Never"
          }
        },
        {
          setAssetId: this.resultRecipeArray[this.findId(this.resultRecipeArray,'【CAMPS】案件検索バッチ用CSV作成')].Id,
          label:'【CAMPS】案件検索バッチ用CSV作成',

          setSchedule: {
            daysOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
            time: {
              hour: 6,
              minute: 15,
              timeZone: "Asia/Tokyo",
            },
            frequency: "weekly",
            notificationLevel: "Never"
          }
        }
      ];

      // 非同期処理を実行する関数を定義
      const asyncFunction = async (obj) => {
        try {
          // 非同期処理を実行
          const result = await updateSchedule({ assetId: obj.setAssetId, schedule:obj.setSchedule });
          
          // 結果を返す
          return result;

        } catch (error) {
          // エラーが発生した場合
          throw new Error(`要素でエラーが発生しました: ${JSON.stringify(obj)}`);
        }
      };

      try {
        // 非同期処理を並行して実行
        const results = await Promise.all(schedules.map(asyncFunction));

        // すべてのスケジュール設定が成功した場合の処理
        console.log('全てのスケジュール設定が成功しました');
        console.log('結果:', results);

        // 成功した場合にアラート表示        
        alert("Schedule updated");

      } catch (error) {
        // エラーが発生した際の設定を表示
        console.error('エラーが発生しました:', error);

        // エラーが発生した箇所の設定をアラート表示        
        alert("Error updating schedule:" + error);

      }
    }

  //配列をつなげる関数を定義
  combineArrays(array1,array2){
    let combineArray  = [];
    for(let i = 0; i < array1.length; i++){
      combineArray.push({Label:array1[i],Id:array2[i]});
    }
    return combineArray;
  }
  //配列の何番目に存在するかを確認する関数を定義
  findId(searchArray,value){
    return searchArray.map(item=>item.Label).indexOf(value);
  }    

  //システム管理者か否かを確認する関数を定義
  @track isNotAdmin = true;
  connectedCallback(){
    const adminProfileId = '00e2w000001NytYAAS';
    //Analyticsスケジュール設定ユーザのプロファイル
    const upAnalyticsProfileId = '00eF8000000HLSgIAO';
   
    getStringUserProfileId()
    .then(profileId =>{
      //this.isNotAdmin = profileId !== adminProfileId;
      this.isNotAdmin = (profileId !== adminProfileId && profileId !== upAnalyticsProfileId);
    })
    .catch(error =>{
      console.error("Error:", error);
    })
  }
}