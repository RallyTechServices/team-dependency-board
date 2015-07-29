Ext.override(Rally.ui.cardboard.plugin.CardIcons, {
    inheritableStatics: {
        getTpl: function() {
            if (!this.tpl) {
                this.tpl = Ext.create('Ext.XTemplate', [
                    '<tpl if="hasIcons">',
                        '<div class="rally-card-icons-ct">',
                        '<tpl if="(showDependencyIcon && isDependencyAccepted) || (hasBlockedField && isBlocked)">',
                            '<div class="rally-card-icons indicator">',
                                '<tpl if="(hasBlockedField && isBlocked)">',
                                    '<div class="indicator-icon icon-blocked"></div>',
                                '<tpl else>',
                                    '<div class="indicator-icon icon-thumbs-up"></div>',
                                '</tpl>',
                        '<tpl else>',
                            '<div class="rally-card-icons" style="visibility: hidden;">',
                        '</tpl>',
                            //'<tpl if="isDone">',
                            //    '<div class="rally-card-icon card-dependency-icon rly-active icon-thumbs-up" role="img">Done</div>',
                            //
                            //'<tpl else>',
                                '<tpl if="showPlusIcon"><div class="rally-card-icon card-plus-icon icon-add" title="New..." role="img"></div></tpl>',
                                '<tpl if="showGearIcon"><div class="rally-card-icon card-gear-icon icon-gear" title="Actions..." role="img"></div></tpl>',
                                 //override for dependency update
                                '<tpl if="showDependencyIcon"><div class="rally-card-icon card-dependency-icon<tpl if="isDependencyAccepted"> rly-active  icon-thumbs-up<tpl else>  icon-thumbs-down</tpl>" role="img"></div></tpl>',
                                '<tpl if="hasReadyField"><div class="rally-card-icon card-ready-icon<tpl if="isReady"> rly-active</tpl> icon-ok" role="img"></div></tpl>',
                                '<tpl if="hasBlockedField"><div class="rally-card-icon card-blocked-icon<tpl if="isBlocked"> rly-active</tpl> icon-blocked" role="img"></div></tpl>',
                                '<tpl if="showColorIcon"><div class="rally-card-icon card-color-icon icon-color" title="Card Color" role="img"></div></tpl>',
                         //   '</tpl>',
                        '</div>',
                    '</div>',
                    '</tpl>'
                ]);
            }
            return this.tpl;
        }
    },
   detachListeners: function() {
        if (this.card) {
            var cardEl = this.card.getEl(),
                el = cardEl && cardEl.down('.rally-card-icons');
            if (el) {
                var readyIconEl = el.down('.card-ready-icon'),
                    blockedIconEl = el.down('.card-blocked-icon'),
                    dependencyIconEl = el.down('.card-dependency-icon');

                if (readyIconEl) {
                    readyIconEl.un('click', this._onReadyIconClick, this);
                }
                if (blockedIconEl) {
                    blockedIconEl.un('click', this._onBlockedIconClick, this);
                }
                if (dependencyIconEl){
                    dependencyIconEl.un('click', this._onDependencyClick, this);
                }
            }
        }
    },

    getHtml: function() {
        var record = this.card.getRecord(),
            hasReady = this.showReadyIcon && this._isIconActiveFor('Ready'),
            hasBlocked = this.showBlockedIcon && this._isIconActiveFor('Blocked'),
            hasIcons = hasReady || hasBlocked || this.showColorIcon || this.showGearIcon || this.showPlusIcon,
            isDone = this._isDone(record);

        if (!hasIcons) {
            return '';
        }
        this.card.on('afterrender', this._onAfterCardRender, this);
        this.card.on('rerender', this._onAfterCardRender, this);
        this.card.on('show', this._fixStyles, this);

        return this.self.getTpl().apply({
            hasReadyField: hasReady,
            hasBlockedField: hasBlocked,
            hasIcons: hasIcons,
            showPlusIcon: this.showPlusIcon && this._getPlusMenuItems().length > 0,
            isBlocked: hasBlocked && !!record.get('Blocked'),
            isReady: hasReady && !!record.get('Ready'),
            showGearIcon: this.showGearIcon,
            showColorIcon: this.showColorIcon,
            formattedId: record.get('FormattedID'),
            name: record.get('Name'),
            //Overrides for dependency thing
            showDependencyIcon: this._hasDependencyTag(),
            isDependencyAccepted: this.card.isApprovedDependency(),
            isDone: isDone
        });
    },
    _isDone: function(record){
        return record.get('ScheduleState') == "Accepted";
    },
    _hasDependencyTag: function(){
        var record = this.card.record,
            hasDependency = false,
            dependencyTags = [this.card.tagDependencyRef,this.card.tagAcceptedRef];

        if (record && record.get('Tags') && record.get('Tags')._tagsNameArray){
            _.each(record.get('Tags')._tagsNameArray, function(t){
                if (Ext.Array.contains(dependencyTags, t._ref)){
                    hasDependency = true;
                }
            });
        }
        return hasDependency;
    },
    _onDependencyClick: function(e){
        var record = this.card.record,
            tagStore = record.getCollection('Tags'),
            fid = record.get('FormattedID');

        var oldTag = this.card.tagDependencyRef,
            newTag = this.card.tagAcceptedRef;
        if (this.card.isApprovedDependency()){
            oldTag = this.card.tagAcceptedRef;
            newTag = this.card.tagDependencyRef;
        }

        tagStore.load({
            scope: this,
            callback: function() {
                tagStore.add(newTag);
                tagStore.remove(oldTag);
                tagStore.sync({
                    callback: function(batch, options, success) {
                        if (batch.exceptions && batch.exceptions.length > 0){
                            Rally.data.util.Record.showWsapiErrorNotification(record, batch.exceptions[0]);
                        } else {
                            this.publish(Rally.Message.objectUpdate, record, ['Tags'], this.card);
                        }
                    }
                });
            }
        });
    },
    _onAfterCardRender: function() {
        var card = this.card,
            cardEl = card.getEl(),
            el = cardEl.down('.rally-card-icons'),
            iconEls = el.query('.rally-card-icon'),
            readyIconEl = el.down('.card-ready-icon'),
            blockedIconEl = el.down('.card-blocked-icon'),
            dependencyIconEl = el.down('.card-dependency-icon');
        this.plusIconEl = el.down('.card-plus-icon');
        this.gearIconEl = el.down('.card-gear-icon');
        this.colorIconEl = el.down('.card-color-icon');

        if (iconEls.length) {
            Ext.fly(iconEls[0]).addCls('rly-left');
            Ext.fly(iconEls[iconEls.length-1]).addCls('rly-right');
        }

        if (readyIconEl) {
            readyIconEl.on('click', this._onReadyIconClick, this);
            this._setReadyIconTooltip(readyIconEl);
        }
        if (blockedIconEl) {
            blockedIconEl.on('click', this._onBlockedIconClick, this);
            this._setBlockedIconTooltip(blockedIconEl);
        }
        if (this.plusIconEl) {
            this.plusIconEl.on('click', this._onPlusTriggerClick, this);
        }

        if (this.gearIconEl) {
            this.gearIconEl.on('click', this._onGearTriggerClick, this);
        }

        if (this.colorIconEl) {
            this.colorIconEl.on('click', this._onColorTriggerClick, this);
        }
           if (dependencyIconEl){
                dependencyIconEl.on('click', this._onDependencyClick, this);
                this._setDependencyIconTooltip(dependencyIconEl);
           }

        this._fixStyles();
    },
    _setDependencyIconTooltip: function(dependencyIconEl) {
        var iconEl = dependencyIconEl || this.card.getEl().down('.card-dependency-icon');
        if (iconEl) {
            var record = this.card.getRecord(),
                isAccepted = this.card.isApprovedDependency(),
                text = isAccepted ? 'Remove Agreement to Dependency' : 'Agree to Dependency';

            iconEl.set({
                'title': text,
                'aria-label': text + ' ' + record.get('FormattedID') + ': ' + record.get('Name')
            });
        }
    }
});

Ext.override(Rally.ui.cardboard.CardBoard,{

    _buildColumnsFromModel: function() {
        var me = this;
        var model = this.models[0];
        if (model) {
            if ( this.attribute === "Iteration" ) {
                var retrievedColumns = [];
                retrievedColumns.push({
                    value: null,
                    columnHeaderConfig: {
                        headerTpl: "{name}",
                        headerData: {
                            name: "Unscheduled"
                        }
                    }
                });
                this._getLocalIterations(retrievedColumns);
            }
        }
    },
    _getLocalIterations: function(retrievedColumns) {
        var me = this;

        var start_date = this.selectedRelease.get('ReleaseStartDate');
        var end_date = this.selectedRelease.get('ReleaseDate');

        var filters = [{property:'StartDate',operator:'<',value: end_date}];
        filters.push({property: 'EndDate', operator: '>', value: start_date});
        if (this.iterationNameFilter){
            filters.push({property: 'Name', operator: 'contains', value: this.iterationNameFilter});
        }
        var iteration_names = [];

        Ext.create('Rally.data.WsapiDataStore',{
            model:me.attribute,
            autoLoad: true,
            filters: filters,
            context: { projectScopeUp: false, projectScopeDown: false },
            sorters: [
                {
                    property: 'EndDate',
                    direction: 'ASC'
                }
            ],
            fetch: ['Name','EndDate','StartDate','PlannedVelocity'],
            listeners: {
                load: function(store,records) {
                    Ext.Array.each(records, function(record){
                        iteration_names.push(record.get('Name'));

                        retrievedColumns.push({
                            value: record,

                            columnHeaderConfig: {
                                headerTpl: "{name}<br/><div class=\"column-card-count\">{start}-{end}</div>",
                                headerData: {
                                    name: record.get('Name'),
                                    start: Rally.util.DateTime.format(Rally.util.DateTime.fromIsoString(record.get('StartDate')),'M d'),
                                    end: Rally.util.DateTime.format(Rally.util.DateTime.fromIsoString(record.get('EndDate')),'M d')

                                }
                            }
                        });
                    });
                    _.map(retrievedColumns,this.addColumn,this);
                    this._renderColumns();
                    //this._getAllIterations(retrievedColumns,iteration_names);
                },
                scope: this
            }
        });
    },
    _getAllIterations: function(retrievedColumns,iteration_names) {
        var me = this;

        var today_iso = Rally.util.DateTime.toIsoString(new Date(),false);
        var filters = [{property:'EndDate',operator:'>',value:today_iso}];

        Ext.create('Rally.data.WsapiDataStore',{
            model:me.attribute,
            autoLoad: true,
            filters: filters,
            sorters: [
                {
                    property: 'EndDate',
                    direction: 'ASC'
                }
            ],
            fetch: ['Name','Project','PlannedVelocity','Children','Parent', 'ObjectID'],
            listeners: {
                load: function(store,records) {
                    console.log('_getAllIterations',records);
                    var current_project = null;
                    if ( this.context ) {
                        current_project = this.context.getProject();
                    }
                    this.fireEvent('columnsretrieved',this,retrievedColumns);
                    this.columnDefinitions = [];
                    _.map(retrievedColumns,this.addColumn,this);
                    this._renderColumns();
                },
                scope: this
            }
        });
    }
});

Ext.override(Rally.ui.cardboard.Column,{
    getStoreFilter: function(model) {
        var property = this.attribute;
        var value = this.getValue();
        if ( this.attribute == "Iteration" ) {
            property = "Iteration.Name";
            if ( value ) {
                value = value.get('Name');
            }
        }
        return {
            property:property,
            operator: '=',
            value: value
        };
    },
    isMatchingRecord: function(record) {
        var recordValue = record.get(this.attribute);
        if (recordValue) {
            recordValue = recordValue.Name;
        }
        var columnValue = this.getValue();
        if ( columnValue ) {
            columnValue = columnValue.get('Name');
        }

        return (columnValue === recordValue );
    },
    addCard: function(card, index, highlight) {
        var record = card.getRecord();
        var target_value = this.getValue();

        if ( target_value && typeof(target_value.get) === "function" ) {
            target_value = this.getValue().get('_ref');
        }

        record.set(this.attribute,target_value);

        if (!Ext.isNumber(index)) {
            //find where it should go
            var records = Ext.clone(this.getRecords());
            records.push(record);
            this._sortRecords(records);

            var recordIndex = 0;
            for (var iIndex = 0, l = records.length; iIndex < l; iIndex++) {
                var i = records[iIndex];
                if (i.get("ObjectID") === record.get("ObjectID")) {
                    recordIndex = iIndex;
                    break;
                }
            }
            index = recordIndex;
        }

        this._renderCard(card, index);

        if (highlight) {
            card.highlight();
        }

        this.fireEvent('addcard');
        card.fireEvent('ready', card);
    },
    _sortRecords: function(records) {
        var sortProperty = this._getSortProperty(),
            sortAscending = true,   //this._getSortDirection() === 'ASC',
            valA, valB;

        // force to new rank style
        sortProperty = "DragAndDropRank";

        records.sort(function(a, b) {
            valA = a.get(sortProperty);
            if (valA && valA._refObjectName) {
                valA = valA._refObjectName;
            }
            valB = b.get(sortProperty);
            if (valB && valB._refObjectName) {
                valB = valB._refObjectName;
            }

            if (valA === valB) {
                return 0;
            }

            if (valA !== null && valA !== undefined) {
                if (valB === null || valB === undefined) {
                    return sortAscending ? -1 : 1;
                } else {
                    return valA > valB ? (sortAscending ? 1 : -1) : (sortAscending ? -1 : 1);
                }
            } else if (valB !== null && valB !== undefined) {
                if (valA === null || valA === undefined) {
                    return sortAscending ? 1 : -1;
                } else {
                    return valB > valA ? (sortAscending ? -1 : 1) : (sortAscending ? 1 : -1);
                }
            }

            //Default case (dates, objects, etc.)
            return sortAscending ? valA - valB : valB - valA;
        });
    }
});

Ext.override(Rally.ui.cardboard.Card,{
    defaultColor: "#FF0000",
    _buildHtml: function () {
        var html = [],
            done_class = "card-table",
            is_done = this.record.get('ScheduleState') == "Accepted";

        var artifactColorDiv = {
            tag: 'div',
            cls: 'artifact-color'
        };
        if (this.record.get('DisplayColor')) {
            artifactColorDiv.style = {
                backgroundColor: this.record.get('DisplayColor')
            };
        } else {
            if (!this.record.get('Ready')){
                artifactColorDiv.style = {
                    backgroundColor: this.defaultColor
                };
            }
        }
        if (is_done){
            done_class = "card-table-done";
        }

        html.push(Ext.DomHelper.createHtml(artifactColorDiv));
        html.push(Ext.String.format('<div class="card-table-ct"><table class="{0}"><tr>', done_class));

        Ext.Array.push(
            html,
            _.invoke(
                _.compact([this.contentLeftPlugin, this.contentRightPlugin]),
                'getHtml'
            )
        );

        html.push('</tr></table>');

        if (this.iconsPlugin) {
            html.push(this.iconsPlugin.getHtml());
        }

        html.push('</div>');

        html = html.join('\n');
        if (is_done){
            html = html.replace('class="rui-field-value"','class="rui-field-value-done"');
        }

        return html;
    },
    shouldShowReadyBorder: function () {
        //(this.isReady() && this.showReadyIcon)
        return  (this.showDependencyStatus && this.isApprovedDependency());
    },
    isApprovedDependency: function(){
        /**
         * override for dependency thing
         */
        var record = this.record,
            isDependencyAccepted = false;

        if (record && record.get('Tags') && record.get('Tags')._tagsNameArray){
            _.each(record.get('Tags')._tagsNameArray, function(t){

                if (t._ref == this.tagAcceptedRef){
                    isDependencyAccepted = true;
                }
            }, this);
        }
        return isDependencyAccepted;
    }
});

Ext.override(Rally.ui.cardboard.plugin.CardContentLeft, {
    /**
     * override to show giver
     */
    _getRenderTpl: function(fieldDefinition) {
        var card = this.card,
            modelField = card.getRecord().getField(fieldDefinition.name),
            hasData = (Ext.isFunction(fieldDefinition.hasValue) && fieldDefinition.hasValue()) || card.getRecord().hasValue(modelField),
            isRenderable = hasData || (modelField && modelField.isCollection()),
            tagFilters = this.card.tagsToFilter.join('|');

        if (modelField && modelField.isHidden) {
            return null;
        }

        if (!isRenderable) {
            return null;
        }

        //Override for giver
        if (fieldDefinition.name == 'Tags'){
            return Ext.create('Rally.technicalservices.renderer.template.FilteredPillTemplate',{
                collectionName: 'Tags',
                cls: 'rui-tag-list-item',
                filterBy: tagFilters,
                filterByFlag: "i"
            });
        }

        if (!fieldDefinition.renderTpl && modelField) {
            return Rally.ui.cardboard.CardRendererFactory.getRenderTemplate(modelField);
        }

        return fieldDefinition.renderTpl;
    }
});

