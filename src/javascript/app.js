Ext.define("team-dependency-board", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    defaults: { margin: 10 },
    items: [
        {xtype:'container',itemId:'criteria_box', layout: {type: 'hbox'}},
        {xtype:'container',itemId:'display_box'},
        {xtype:'tsinfolink'}
    ],
    dependencyTag: 'Dependency',
    tagsOfInterest: ['Dependency','Impediment'],
    giveTagPattern: 'Issuer:',
    /**
     * controls
     */
    cbRelease: null,

    launch: function() {
        this._initApp();
    },
     _initApp: function(){
        this.cbRelease= this.down('#criteria_box').add({
            xtype: 'rallyreleasecombobox',
            stateful: true,
            stateId: this.getContext().getScopedStateId('cb-release'),
            listeners: {
                scope: this,
                select: this._releaseSelected,
                ready: this._releaseSelected
            }
        });
         this.down('#criteria_box').add({
             xtype: 'rallybutton',
             text: 'Print Cards',
             listeners: {
                 scope: this,
                 click: this._print
             }
         });
    },
    _openPrintWindow:function(store, records, success){
        var giverPattern = new RegExp("^" + this.giveTagPattern,"i");
        var giveTagPrefix = this.giveTagPattern;
        var fields =[{
            dataIndex: 'FormattedID',
            cls: 'cardUpperLeft'
        },
            {
                dataIndex: 'Iteration',
                cls: 'cardUpperRight',
                renderer: function(value,meta_data,record){
                    var iteration = record.get('Iteration');
                    var iteration_name = "Unscheduled";
                    if ( iteration ) {
                        iteration_name = iteration.Name;
                    }

                    return iteration_name;
                }
            },
            {
                dataIndex: 'PlanEstimate',
                cls: 'cardLowerRight',
                renderer: function(value,meta_data,record){
                    if (value){
                        return Ext.String.format('({0})',value);
                    }
                    return '(--)';
                }
            },
            {
                dataIndex: 'Project',
                cls: 'cardLowerLeft',
                renderer: function(value,meta_data,record){
                    var project = record.get('Project');
                    var project_name = "";
                    if (project){
                        project_name = project.Name;
                    }
                    var tags = record.get('Tags');
                    var giver = "";
                    if (tags && tags._tagsNameArray){

                        Ext.each(tags._tagsNameArray, function(tag){
                            if (giverPattern.test(tag.Name)){
                                giver += tag.Name + "<br/>";
                            }
                        });
                    }
                    if (giver.length == 0){
                        giver = giveTagPrefix + " (Not tagged)<br/>";
                    }
                    return Ext.String.format("{0}Receiver: {1}",giver, project_name);
                }
            },
            {
                dataIndex: 'Name',
                maxLength: 100,
                cls: 'cardTitle'

            },{
                dataIndex: 'Feature',
                cls: 'cardSubtitle',
                renderer: function(value,meta_data,record){
                    var feature = 'No Feature';
                    if (record.get('Feature')){
                        feature = Ext.String.format('Feature {0}: {1}',record.get('Feature').FormattedID, record.get('Feature').Name);
                    }
                    return feature;

                }
            }];

        var win = Ext.create('Rally.technicalservices.window.PrintCards',{
            records: records,
            displayFields: fields,
            currentDocument: Ext.getDoc()
        });
        win.show();

    },
    _print: function(){
        var releaseName = this.cbRelease.getRecord().get(this.cbRelease.displayField);

        Ext.create('Rally.data.wsapi.Store',{
            fetch: ['FormattedID','Iteration','Project','Name','Tags','PlanEstimate','Feature'],
            model: 'HierarchicalRequirement',
            filters:  this._getFilters(releaseName),
            //    [{
            //    property: 'Release.Name',
            //    value: releaseName
            //},{
            //    property: 'Tags.Name',
            //    operator: 'contains',
            //    value: this.dependencyTag
            //}],
            autoLoad: true,
            listeners: {
                scope: this,
                load: this._openPrintWindow
            }
        });
    },
    _releaseSelected: function(cb){
        var releaseName = cb.getRecord().get(cb.displayField);
        this._updateCardboard(releaseName);
    },
    _getIterationNameFilter: function(releaseName){
        var iterationNameFilter = null;
        if (releaseName){
            var match = /Release ([\d]*)/.exec(releaseName);
            if (match && match.length > 1){
                return 'R' + match[1];
            }
        }
        return iterationNameFilter;
    },
    _updateCardboard: function(releaseName){
        this.logger.log('_updateCardboard for release ', releaseName);

        if (this.down('#rally-board')){
            this.down('#rally-board').destroy();
        }

        this.down('#display_box').add({
            itemId: 'rally-board',
            xtype: 'rallycardboard',
            attribute: 'Iteration',
            context: this.getContext(),
            selectedRelease: this.cbRelease.getRecord(),
            iterationNameFilter: this._getIterationNameFilter(releaseName),
            enableRanking: false,
            enableCrossColumnRanking: false,
            columnConfig: {
                enableCrossRowDragging: false,
                dropControllerConfig: false,
                plugins: ['rallycardboardcollapsiblecolumns']
            },
            rowConfig: {
                field: 'Project'
            },
            cardConfig: {
                fields: ['Name','Feature','Tags','PlanEstimate'],
                showPlusIcon: false,
                showRankMenuItems: false,
                showSplitMenuItem: false,
                showColorIcon: true,
                showReadyIcon: true,
                showBlockedIcon: false
            },
            storeConfig: {
                filters: this._getFilters(releaseName)
                //    [{
                //    property: 'Release.Name',
                //    value: releaseName
                //},{
                //    property: 'Tags.Name',
                //    operator: 'contains',
                //    value: this.dependencyTag
                //}]
            }
        });
    },
    _getFilters: function(releaseName){
        var filters = [];
        Ext.each(this.tagsOfInterest, function(tag){
            filters.push(Ext.create('Rally.data.wsapi.Filter', {
                property: 'Tags.Name',
                operator: 'contains',
                value: tag
            }));
        });
        filters = Rally.data.wsapi.Filter.or(filters);
        filters = filters.and(Ext.create('Rally.data.wsapi.Filter',{
            property: 'Release.Name',
            value: releaseName
        }));
        return filters;
    }

});
