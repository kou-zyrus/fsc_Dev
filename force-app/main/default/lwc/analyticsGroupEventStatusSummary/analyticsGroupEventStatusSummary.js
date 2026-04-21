import SystemModstamp from '@salesforce/schema/Account.SystemModstamp';
import { LightningElement, api } from 'lwc';

export default class AnalyticsGroupEventStatusSummary extends LightningElement {

    @api results;


    get processingResult() {
        const aggregateValues = (data) => {
            // MainOperatorIdごとに集計
            const temp = data.reduce((acc, item) => {
                const key = item.MainOperatorId;
                if (!acc[key]) {
                    acc[key] = {
                        MainOperatorAgencyCode: item.MainOperatorAgencyCode,
                        MainOperatorName: item.MainOperatorName,
                        MainOperatorId: item.MainOperatorId,
                        EventSummaryMainOp: 0,
                        EventExistMainOp: 0,
                        GroupCountMainOp: 0,
                        totalType: ''
                    };
                }
                acc[key].EventSummaryMainOp += item.EventSummaryMainOp;
                acc[key].EventExistMainOp += item.EventExistMainOp;
                acc[key].GroupCountMainOp += item.GroupCountMainOp;
                return acc;
            }, {});
            
            const aggregatedData = Object.values(temp).length > 1000 ? Object.values(temp).slice(0,1000) : Object.values(temp);
        
            // MainOperatorAgencyCodeで小計を追加し、各グループ内の最後の行の後ろに挿入
            const resultWithSubtotals = [];
            const subtotalMap = {};
            const total = {
                MainOperatorAgencyCode: '合計',
                MainOperatorName: '',
                MainOperatorId: '',
                EventSummaryMainOp: 0,
                EventExistMainOp: 0,
                GroupCountMainOp: 0,
                totalType: 'Total'
            };
        
            let currentAgencyCode = null;
        
            aggregatedData.forEach(item => {
                const agencyCode = item.MainOperatorAgencyCode;
                const key = item.MainOperatorId;
                
                if (!subtotalMap[agencyCode]) {
                    subtotalMap[agencyCode] = {
                        MainOperatorAgencyCode: agencyCode,
                        MainOperatorName: '小計',
                        MainOperatorId: `Subtotal-${agencyCode}`,
                        EventSummaryMainOp: 0,
                        EventExistMainOp: 0,
                        GroupCountMainOp: 0,
                        totalType: 'Subtotal'
                    };
                }
                subtotalMap[agencyCode].EventSummaryMainOp += item.EventSummaryMainOp;
                subtotalMap[agencyCode].EventExistMainOp += item.EventExistMainOp;
                subtotalMap[agencyCode].GroupCountMainOp += item.GroupCountMainOp;
        
                total.EventSummaryMainOp += item.EventSummaryMainOp;
                total.EventExistMainOp += item.EventExistMainOp;
                total.GroupCountMainOp += item.GroupCountMainOp;
        
                if (currentAgencyCode !== agencyCode) {
                    // 新しいAgencyCodeが始まったら小計行を挿入
                    if (currentAgencyCode !== null) {
                        resultWithSubtotals.push(subtotalMap[currentAgencyCode]);
                    }
                    currentAgencyCode = agencyCode;
                }
        
                resultWithSubtotals.push(item);
            });
        
            // 最後のAgencyCodeの小計行を挿入
            if (currentAgencyCode !== null) {
                resultWithSubtotals.push(subtotalMap[currentAgencyCode]);
            }
        
            // Total行を追加
            resultWithSubtotals.push(total);
        
            return resultWithSubtotals;
        };
        
        const aggregateResults = aggregateValues(this.results);



        const processingResult = []
        let previousMainOperatorAgencyCode;
        let nextMainOperatorAgencyCode;

        for(let i = 0; i < aggregateResults.length; i++){

            //前後の値を取得
            if (aggregateResults.length == 1) {
                previousMainOperatorAgencyCode = aggregateResults[i].MainOperatorAgencyCode + 'first';
                nextMainOperatorAgencyCode = aggregateResults[i].MainOperatorAgencyCode + 'last';
            } else if (i == 0) {
                previousMainOperatorAgencyCode = aggregateResults[i].MainOperatorAgencyCode + 'first';
                nextMainOperatorAgencyCode = aggregateResults[i+1].MainOperatorAgencyCode;
            } else if (i == aggregateResults.length-1) {
                previousMainOperatorAgencyCode = aggregateResults[i-1].MainOperatorAgencyCode;
                nextMainOperatorAgencyCode = aggregateResults[i].MainOperatorAgencyCode + 'last';
            } else {
                previousMainOperatorAgencyCode = aggregateResults[i-1].MainOperatorAgencyCode;
                nextMainOperatorAgencyCode = aggregateResults[i+1].MainOperatorAgencyCode;
            }

            const newItem = {...aggregateResults[i]};
            if (newItem.EventExistMainOp != 0) {
                newItem.eventRate = ((newItem.EventExistMainOp / newItem.GroupCountMainOp)*100).toFixed(1) + '%';
            } else {
                newItem.eventRate = '0%';
            }

            /**
             * 前後の値と現在の値を比較し、下記の通り設定
             * ・前の値と異なり後ろの値と同じ場合 ⇒ 値を表示、セルの下の罫線をなくす
             * ・前の値と同じで後ろの値と同じ場合 ⇒ 値を非表示、セルの上下の罫線をなくす
             * ・前の値と異なり後ろの値と同じ場合 ⇒ 値を非表示、セルの上の罫線をなくす
             * ・前後の値と異なる場合 ⇒ 値を表示、セルの上下の罫線を表示
             */
            if (newItem.MainOperatorAgencyCode != previousMainOperatorAgencyCode && newItem.MainOperatorAgencyCode == nextMainOperatorAgencyCode) {
                newItem.hideBorderMainOperatorAgencyCode = 'hide-bottom-border';
            } else if (newItem.MainOperatorAgencyCode == previousMainOperatorAgencyCode && newItem.MainOperatorAgencyCode == nextMainOperatorAgencyCode) {
                newItem.hideBorderMainOperatorAgencyCode = 'hide-top-bottom-border';
                newItem.MainOperatorAgencyCode = '';
            } else if (newItem.MainOperatorAgencyCode == previousMainOperatorAgencyCode && newItem.MainOperatorAgencyCode != nextMainOperatorAgencyCode) {
                newItem.hideBorderMainOperatorAgencyCode = 'hide-top-border';
                newItem.MainOperatorAgencyCode = '';
            } else {
                newItem.hideBorderMainOperatorAgencyCode = 'show-border';
            }

            if (i == aggregateResults.length-1) {
                newItem.hideBorderMainOperatorAgencyCode = 'hide-right-border Total';
            }

            if (newItem.totalType == null) {
                newItem.integerClass = 'integer';
            } else {
                newItem.integerClass = 'integer ' + newItem.totalType;
            }


            processingResult.push(newItem);

        }

        return processingResult;

    }
}