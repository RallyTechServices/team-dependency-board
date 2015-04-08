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
        var filters = [{property:'StartDate',operator:'>=',value:start_date}];

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

Ext.override(Rally.ui.cardboard.Card,{
    defaultColor: "#FF0000",
    acknowledgedColor: '#0000FF',
    _buildHtml: function () {
        var html = [];

        var artifactColorDiv = {
            tag: 'div',
            cls: 'artifact-color'
        };
        if (this.record.get('DisplayColor')) {
            artifactColorDiv.style = {
                backgroundColor: this.record.get('DisplayColor')
            };
        } else {
            artifactColorDiv.style = {
                backgroundColor: this.defaultColor
            };
        }
        html.push(Ext.DomHelper.createHtml(artifactColorDiv));
        html.push('<div class="card-table-ct"><table class="card-table"><tr>');

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

        return html.join('\n');
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
                filterBy: '^Issuer:',
                filterByFlag: "i"
            });
        }

        if (!fieldDefinition.renderTpl && modelField) {
            return Rally.ui.cardboard.CardRendererFactory.getRenderTemplate(modelField);
        }

        return fieldDefinition.renderTpl;
    }
});

