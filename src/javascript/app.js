Ext.define("team-dependency-board", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    defaults: { margin: 10 },
    items: [
        {xtype:'container',itemId:'criteria_box', layout: {type: 'hbox'}},
        {xtype:'container',itemId:'display_box', cls: 'dependency-board'},
        {xtype:'tsinfolink'}
    ],
    dependencyTag: 'Dependency',
    acceptedDependencyTag: 'Agreed to Dependency',
    tagsOfInterest: ['Dependency','Impediment','Blocker','Agreed to Dependency'],
    giveTagPattern: 'Issuer:',
    cardFields: ['Name','Feature','c_DCOpsKanban','CreationDate','c_NeedByDate','c_BlockerEstimatedResolutionDate','Tags','PlanEstimate'],
    fetchFields: ['FormattedID','Iteration','Project','Name',
        'Tags','PlanEstimate','Feature',
        'c_DCOpsKanban','CreationDate','c_NeedByDate','ScheduleState'],

    tagRefs: {},
    /**
     * controls
     */
    cbRelease: null,

    launch: function() {
        this._getTagRefs();

    },
    _getTagRefs: function(){

        var filters=  Ext.create('Rally.data.wsapi.Filter',{
            property: 'Name',
            value: this.dependencyTag
        });
        filters = filters.or(Ext.create('Rally.data.wsapi.Filter',{
            property: 'Name',
            value: this.acceptedDependencyTag
        }));

        var store = Ext.create('Rally.data.wsapi.Store',{
            model: 'Tag',
            fetch: ['Name','_ref'],
            filters: filters
        });
        store.load({
            scope: this,
            callback: function(records, operation, success){
                this.logger.log('tags fetched',success,records,operation);
                _.each(records, function(r){
                   this.tagRefs[r.get('Name')] = r.get('_ref');
                }, this);

                if (!this.tagRefs[this.acceptedDependencyTag] || !this.tagRefs[this.dependencyTag]){
                    this.add({
                        xtype: 'container',
                        html: Ext.String.format('Please verify the necessary tags for this app have been created or change them in the configuration in the code:<br/> <li><b>{0}</b></li><li><b>{1}</li></b>',
                            this.acceptedDependencyTag, this.dependencyTag)
                    });
                } else {
                    this._initApp();
                }
                this.logger.log('Tag refs: ',this.tagRefs);
            }
        });
    },
    _createTags: function(tagsToCreate){
        var deferred = Ext.create('Deft.Deferred');
        this.logger.log('_createTags',tagsToCreate);

        Rally.data.ModelFactory.getModel({
            type: 'Tag',
            scope: this,
            success: function(model) {
                this.logger.log('Tag model fetched');

                var promises = [];
                _.each(tagsToCreate, function(tag){
                    var record = Ext.create(model, {
                        Name: tag
                    });
                    promises.push(record.save({
                        callback: function(result, operation) {
                            var deferred = Ext.create('Deft.Deferred');
                            if(operation.wasSuccessful()) {
                                deferred.resolve(result);
                            } else {
                                deferred.reject(operation);
                            }
                            return deferred;
                        }
                    }));
                });
                Deft.Promise.all(promises).then({
                    success: function(results){
                        deferred.resolve(results);
                    },
                    failure: function(operation){
                        deferred.reject(operation);
                    }
                });
            }
        });
        return deferred;
    },
     _initApp: function(){
        this.cbRelease= this.down('#criteria_box').add({
            xtype: 'rallyreleasecombobox',
            stateful: true,
            itemId: 'cb-release',
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
         this.down('#criteria_box').add({
             xtype: 'rallycheckboxfield',
             itemId: 'chk-show-done',
             fieldLabel: 'Show done items',
             listeners: {
                 scope: this,
                 change: this._releaseSelected
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
                    
                    var ops = record.get( 'c_DCOpsKanban' );
                    if ( !Ext.isEmpty(ops) ) {
                        ops = "DC Ops Kanban: " + ops + "<br/>";
                    }
                    
                    var creation = "Created: " + Ext.util.Format.date(record.get('CreationDate'),'m/d/Y') + "<br/>";
                    var need = "Need by: " + Ext.util.Format.date(record.get('c_NeedByDate'),'m/d/Y') + "<br/>";
                    var resolution = "Est. Resolution: " + Ext.util.Format.date(record.get('c_BlockerEstimatedResolutionDate'),'m/d/Y') + "<br/>";
                    return Ext.String.format("{0}{1}{2}{3}{4}Receiver: {5}",ops,creation,need,resolution, giver, project_name);
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

            fetch: this.fetchFields,
            model: 'HierarchicalRequirement',
            filters:  this._getFilters(releaseName),
            autoLoad: true,
            listeners: {
                scope: this,
                load: this._openPrintWindow
            }
        });
    },
    _releaseSelected: function(cb){
        var cb = this.down('#cb-release');
        var releaseName = cb.getRecord().get(cb.displayField);
        var showDoneItems = this.down('#chk-show-done').getValue() || false;
        this._updateCardboard(releaseName, showDoneItems);
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
    _updateCardboard: function(releaseName, showDoneItems){
        this.logger.log('_updateCardboard for release ', releaseName, showDoneItems);

        if (this.down('#rally-board')){
            this.down('#rally-board').destroy();
        }
        var tagsToFilter = ['^' + this.giveTagPattern].concat(this.tagsOfInterest);
        this.down('#display_box').add({
            itemId: 'rally-board',
            xtype: 'rallycardboard',
            attribute: 'Iteration',
            context: this.getContext(),
            selectedRelease: this.cbRelease.getRecord(),
            iterationNameFilter: this._getIterationNameFilter(releaseName),
            enableRanking: false,
            enableCrossColumnRanking: false,
            plugins: [
                
                {ptype: 'rallyfixedheadercardboard'}
            ],
            columnConfig: {
                enableCrossRowDragging: false,
                dropControllerConfig: false,
                plugins: ['rallycardboardcollapsiblecolumns']
            },
            rowConfig: {
                field: 'Project'
            },
            cardConfig: {
                fields: this.cardFields,
                showPlusIcon: false,
                showRankMenuItems: false,
                showSplitMenuItem: false,
                showColorIcon: true,
                showReadyIcon: false,
                showBlockedIcon: false,
                showAddChildMenuItem: false,
                showCopyTasksFrom: false,
                showDependencyStatus: true,
                tagDependencyRef: this.tagRefs[this.dependencyTag],
                tagAcceptedRef: this.tagRefs[this.acceptedDependencyTag],
                tagsToFilter: tagsToFilter
            },
            storeConfig: {
                filters: this._getFilters(releaseName),
                fetch: this.fetchFields
            },
            height: this.getHeight() - 100
        });

    },
    _getFilters: function(releaseName){
        this.logger.log('_getFilters', releaseName);
        var tag_filters = [],
            dependency_tag = this.dependencyTag;

        var filters = Ext.create('Rally.data.wsapi.Filter',{
            property: 'Release.Name',
            value: releaseName
        });

        Ext.each(this.tagsOfInterest, function(tag){
            tag_filters.push(Ext.create('Rally.data.wsapi.Filter', {
                property: 'Tags.Name',
                operator: '=',
                value: tag
            }));
        });
        tag_filters = Rally.data.wsapi.Filter.or(tag_filters);

        filters = filters.and(tag_filters);

        var show_done = this.down('#chk-show-done').getValue() || false;
        console.log('show_done', show_done);
        if (!show_done){
            filters = filters.and(Ext.create('Rally.data.wsapi.Filter',{
                property: 'ScheduleState',
                operator: '<',
                value: "Accepted"
            }));

            var done_filters = Ext.create('Rally.data.wsapi.Filter',{
                property: 'Tags.Name',
                operator: '=',
                value: dependency_tag
            });
            done_filters = done_filters.and(Ext.create('Rally.data.wsapi.Filter',{
                property: 'ScheduleState',
                value: "Accepted"
            }));
            done_filters = done_filters.and(Ext.create('Rally.data.wsapi.Filter',{
                property: "Release.Name",
                value: releaseName
            }));
            filters = filters.or(done_filters);
        }
        return filters;
    }
});
