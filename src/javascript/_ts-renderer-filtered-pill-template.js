Ext.define('Rally.technicalservices.renderer.template.FilteredPillTemplate', {
        extend: 'Ext.XTemplate',
        requires: [
            'Rally.util.Array',
            'Rally.util.Ref'
        ],
        constructor: function(config) {
            var filterRegex = new RegExp(config.filterBy,config.filterByFlag),
                collectionName = config.collectionName,
                iconCls = config.iconCls,
                cls = config.cls,
                templateConfig = [
                    '{[this.joinNames(values)]}',
                    {
                        joinNames: function(recordData) {
                            var names = recordData[collectionName];
                            if (names._tagsNameArray) {
                                names = names._tagsNameArray ? names._tagsNameArray : names;
                            } else {
                                names = _.map(names, function(obj) {
                                    if (obj.get('Name') == 'Blocker'){
                                        return {
                                            _ref: obj.get('_ref'),
                                            Name: obj.get('Name'),
                                            //DisplayColor: 'red'
                                        };
                                    }
                                    return {
                                        _ref: obj.get('_ref'),
                                        Name: obj.get('Name')
                                    };
                                });
                            }

                            var filteredNames =  Ext.Array.filter(names, function(a) {
                                var val = a['Name'];

                                if (val && filterRegex.test(val)) {
                                    return true;
                                }
                                return false;
                            });
                            filteredNames = Rally.util.Array.sortByAttribute(filteredNames, 'Name');

                            return _.reduce(filteredNames, function(memo, name) {
                                var colorAttr = name.DisplayColor ? ' style="color: ' + name.DisplayColor + ';"' : '';
                                return memo += '<span class="' + cls + '"><span class="' + iconCls + '"' + colorAttr + '></span>'+ name.Name +'</span>';
                            }, '');
                        }
                    },
                    config
                ];

            return this.callParent(templateConfig);
        }
    }
);