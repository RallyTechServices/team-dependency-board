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
                            name: "Backlog"
                        }
                    }
                });

                this._getLocalIterations(retrievedColumns);
            }
        }
    },
    _getLocalIterations: function(retrievedColumns) {
        var me = this;

        //var start_date = this.startIteration.get('formattedStartDate');
        //var filters = [{property:'StartDate',operator:'>=',value:start_date}];

        var iteration_names = [];

        Ext.create('Rally.data.WsapiDataStore',{
            model:me.attribute,
            autoLoad: true,
            //filters: filters,
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
                                headerTpl: "{name}",
                                headerData: {
                                    name: record.get('Name')
                                }
                            }
                        });
                    });
                    this._getAllIterations(retrievedColumns,iteration_names);
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

Ext.define('Rally.ui.cardboard.plugin.CardContentLeft', {
    alias: 'plugin.rallycardcontentleft',
    extend: 'Ext.AbstractPlugin',
    requires: [
        'Rally.ui.cardboard.CardRendererFactory',
        'Ext.XTemplate',
        'Rally.ui.renderer.template.FormattedIDTemplate'
    ],

    mixins: {
        observable: 'Ext.util.Observable'
    },

    /**
     * @private
     * Fields that are NOT children of the rui-card-content div.
     */
    nonDisplayableFields: ['PlanEstimate', 'FormattedID', 'Owner', 'PreliminaryEstimate', 'Estimate'],

    footerFields: ['PercentDoneByStoryPlanEstimate', 'PercentDoneByStoryCount', 'UserStories', 'PredecessorsAndSuccessors', 'Milestones'],

    statics: {
        getIdTpl: function() {
            if (!this.idTpl) {
                this.idTpl = Ext.create('Rally.ui.renderer.template.FormattedIDTemplate');
            }

            return this.idTpl;
        },

        getHeaderTpl: function() {
            if (!this.headerTpl) {
                this.headerTpl = Ext.create('Ext.XTemplate', [
                    '<div class="left-header">',
                    '<div class="id" style="min-width: {idWidth}px">{formattedId}</div>',
                    '<tpl if="owner"><div class="owner-name">{owner}</div></tpl>',
                    '</div>']);
            }

            return this.headerTpl;
        }
    },

    constructor: function(config) {
        this.addEvents(
            /**
             * @event fieldclick
             * Fires when a field displayed on the content portion of the card is clicked.
             *
             * @param {String} fieldName The name of the field that was clicked
             * @param {Rally.ui.cardboard.Card} card The card whose field was clicked
             */
            'fieldclick'
        );
        this.callParent(arguments);
        this.mixins.observable.constructor.call(this);
    },

    init: function(card) {
        this.callParent(arguments);
        this.card = card;
        card.contentLeftPlugin = this;
        card.on('afterrender', this._onAfterRender, this);
        card.on('rerender', this._onAfterRender, this);
        card.on('beforedestroy', this._onBeforeDestroy, this);

        card.relayEvents(this, [
        /**
         * @event fieldclick
         * Forwarded event from Rally.ui.cardboard.plugin.CardContent#fieldclick
         * @member Rally.ui.cardboard.Card
         * @inheritdoc Rally.ui.cardboard.plugin.CardContent#fieldclick
         */
            'fieldclick'
        ]);
    },

    destroy: function() {
        if (this.card) {
            this.detachListeners();
            delete this.card.contentLeftPlugin;
            delete this.card;
        }

        this.callParent(arguments);
    },

    detachListeners: function() {
        if (this.card && this.card.getEl()) {
            this.card.getEl().down('.rui-card-content').un('click', this._onClick, this);
        }
    },

    getDisplayedFields: function() {
        return this.card.getFieldNames();
    },

    getHtml: function() {
        var contentHtml = [],
            statusHtml = [];

        _.each(
            _.filter(
                this.card.getFieldDefinitions(),
                function(fieldDefinition) {
                    return this._isDisplayableField(fieldDefinition.name) && !this._isFieldHandledByPlugin(fieldDefinition.name);
                },
                this
            ),
            function(fieldDefinition) {
                var fieldHtml = this._getFieldHtml(fieldDefinition);
                if (fieldHtml) {
                    if (this._isStatusField(fieldDefinition)) {
                        statusHtml.push(fieldHtml);
                    } else {
                        contentHtml.push(fieldHtml);
                    }
                }
            },
            this
        );

        var result = [];
        result.push('<td class="rui-card-content">');
        result.push(this.getCardHeader());
        result.push(contentHtml.join('\n'));
        result.push(this.getCardFooter());

        if (this._isFieldHandledByPlugin('BlockedReason')) {
            result.push(this._getBlockedReasonContent());
        }
        result.push('<div class="status-content">');
        result.push(statusHtml.join('\n'));
        result.push('</div></td>');

        return result.join('\n');
    },

    _isFieldHandledByPlugin: function(fieldName){
        return fieldName === 'BlockedReason' && this.card.blockedReasonPlugin && !this.card.blockedReasonPlugin.isBlockedOrBlockedReasonHidden();
    },

    _isDisplayableField: function(fieldName){
        return !_.contains(this.nonDisplayableFields.concat(this.footerFields), fieldName);
    },

    _isStatusField: function(fieldDefinition) {
        if (fieldDefinition.hasOwnProperty('isStatus')) {
            return fieldDefinition.isStatus;
        }

        return Rally.ui.cardboard.CardRendererFactory.isStatusField(fieldDefinition);
    },

    addField: function(fieldDefinition) {
        var fieldHtml = this._getFieldHtml(fieldDefinition);
        if (fieldHtml) {
            if (this._isStatusField(fieldDefinition)) {
                this._getStatusContent().createChild(fieldHtml);
            } else {
                this._getCardContent().createChild(fieldHtml, this._getStatusContent());
            }
        }
    },

    getFieldEl: function(fieldName) {
        return this.card.getEl().down('.field-content.' + fieldName);
    },

    refreshField: function(fieldName) {
        if(!_.contains(this.nonDisplayableFields, fieldName)) {
            var el = this.getFieldEl(fieldName),
                tpl = this._getRenderTpl({name: fieldName});
            if (el && tpl) {
                el.update(tpl.apply(this.card.getRecord().getData()));
            }
        }
    },
    /**
     * override to show giver
     */
    _getRenderTpl: function(fieldDefinition) {
        var card = this.card,
            modelField = card.getRecord().getField(fieldDefinition.name),
            hasData = (Ext.isFunction(fieldDefinition.hasValue) && fieldDefinition.hasValue()) || card.getRecord().hasValue(modelField),
            isRenderable = hasData || (modelField && modelField.isCollection());


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
                filterBy: '^Give:',
                filterByFlag: "i"
            });
        }

        if (!fieldDefinition.renderTpl && modelField) {
            return Rally.ui.cardboard.CardRendererFactory.getRenderTemplate(modelField);
        }

        return fieldDefinition.renderTpl;
    },

    _getFieldHtml: function(fieldDefinition) {
        var html = '',
            cls = '',
            typeCls = '',
            tpl = this._getRenderTpl(fieldDefinition);

        if (tpl) {
            html = tpl.apply(this.card.getRecord().data);

            if (html) {
                cls = this._isStatusField(fieldDefinition) ? 'status-field ' : '';

                var field = this.card.getRecord().self.getField(fieldDefinition.name);
                if (field && field.attributeDefinition) {
                    typeCls = ' type-' + field.attributeDefinition.AttributeType.toLowerCase();
                }
                html = '<div class="field-content ' + cls + fieldDefinition.name + typeCls + '">' + html + '</div>';
            }
        }

        return html;
    },

    _getCardContent: function() {
        return this.card.getEl().down('.rui-card-content');
    },

    _getStatusContent: function() {
        return this._getCardContent().down('.status-content');
    },

    _getBlockedReasonContent: function() {
        return this.card.blockedReasonPlugin ? this.card.blockedReasonPlugin.getHtml() : '';
    },

    getCardHeader: function() {
        var record = this.card.getRecord(),
            formattedId = record.get('FormattedID'),
            data = {};

        if (formattedId) {
            data.idWidth = 20 + (formattedId.length * 8);
            data.formattedId = this.self.getIdTpl().apply(record.data);
            data.owner = record.get('Owner') ? record.get('Owner')._refObjectName : null;

            return this.self.getHeaderTpl().apply(data);
        }

        return '';
    },

    getCardFooter: function() {
        var footerHtml = _.reduce(this.footerFields, function (html, fieldName) {
            var fieldDefinition = _.find(this.card.getFieldDefinitions(), function (fieldDefinition) {
                return fieldDefinition.name === fieldName;
            });

            return fieldDefinition ? html + this._getFieldHtml(fieldDefinition) + '\n' : html;
        }, '', this);

        if (footerHtml.length) {
            return '<div class="card-footer">' + footerHtml + '</div>';
        }

        return '';
    },

    _onAfterRender: function() {
        this._getCardContent().on('click', this._onClick, this);
        if(this.card.getEl().down('.formatted-id-template')){
            this.card.getEl().down('.formatted-id-template').on('mouseenter', this.card.popoverPlugin.showDescription, this.card.popoverPlugin);
        }
    },

    _onBeforeDestroy: function() {
        if (this.card && this.card.getEl() && this.card.getEl().down('.id')){
            this.card.getEl().down('.formatted-id-template').un('mouseenter', this.card.popoverPlugin.showDescription, this.card.popoverPlugin);
        }
    },

    _onClick: function(e) {
        var target = e.getTarget('.field-content', this._getCardContent(), false);
        if (!target) {
            return;
        }

        var fieldName = _.find(target.className.split(' '), function(className) {
            return !_.contains(['field-content', 'status-field'], className);
        });
        if (Ext.isDefined(fieldName)) {
            this._onFieldClick(fieldName.replace(/Summary$/, ''), e, target);
        }
    },

    _onFieldClick: function(fieldName) {
        this.fireEvent('fieldclick', fieldName, this.card);
    }
});

