Ext.define('Rally.ui.cardboard.plugin.CardIcons', {
    alias: 'plugin.rallycardicons',
    extend: 'Ext.AbstractPlugin',
    requires: [
        'Rally.data.util.Record',
        'Rally.ui.menu.DefaultRecordMenu',
        'Rally.util.Test'
    ],

    mixins: {
        messageagble: 'Rally.Messageable'
    },

    clientMetrics: [{
        method: '_onBlockedIconClick',
        description: 'blocked icon clicked'
    },{
        method: '_onReadyIconClick',
        description: 'ready icon clicked'
    }],

    inheritableStatics: {
        getTpl: function() {
            if (!this.tpl) {
                this.tpl = Ext.create('Ext.XTemplate', [
                    '<tpl if="hasIcons">',
                    '<div class="rally-card-icons-ct">',
                    '<tpl if="(hasReadyField && isReady) || (hasBlockedField && isBlocked)">',
                    '<div class="rally-card-icons indicator">',
                    '<tpl if="(hasBlockedField && isBlocked)">',
                    '<div class="indicator-icon icon-blocked"></div>',
                    '<tpl else>',
                    '<div class="indicator-icon icon-ready"></div>',
                    '</tpl>',
                    '<tpl else>',
                    '<div class="rally-card-icons" style="visibility: hidden;">',
                    '</tpl>',
                    '<tpl if="showPlusIcon"><div class="rally-card-icon card-plus-icon icon-add" title="New..." role="img"></div></tpl>',
                    '<tpl if="showGearIcon"><div class="rally-card-icon card-gear-icon icon-gear" title="Actions..." role="img"></div></tpl>',
                    '<tpl if="hasReadyField"><div class="rally-card-icon card-ready-icon<tpl if="isReady"> rly-active</tpl> icon-ok" role="img"></div></tpl>',
                    '<tpl if="hasBlockedField"><div class="rally-card-icon card-blocked-icon<tpl if="isBlocked"> rly-active</tpl> icon-blocked" role="img"></div></tpl>',
                    '<tpl if="showColorIcon"><div class="rally-card-icon card-color-icon icon-color" title="Card Color" role="img"></div></tpl>',
                    '</div>',
                    '</div>',
                    '</tpl>'
                ]);
            }
            return this.tpl;
        }
    },

    config: {

        /**
         * @cfg {Boolean}
         * set to false to not show the plus icon button
         */
        showPlusIcon: true,

        /**
         * @cfg {Boolean}
         * set to false to not show the gear icon
         */
        showGearIcon: true,

        /**
         * @cfg {Boolean}
         * set to false to not show the color icon
         */
        showColorIcon: false,

        /**
         * @cfg {Boolean}
         * set to false to not show the ready icon
         */
        showReadyIcon: true,

        /**
         * @cfg {Boolean}
         * set to false to not show the blocked icon
         */
        showBlockedIcon: true,

        /**
         * Configuration for the gear menu. See config for Rally.ui.cardboard.CardGearMenu
         */
        gearMenuConfig: {

            /**
             * @cfg {Boolean}
             * set to false to not show the edit menu item in the gear menu
             */
            showEditMenuItem: true,

            /**
             * @cfg {Boolean}
             * set to false to not show the copy menu item in the gear menu
             */
            showCopyMenuItem: true,

            /* @cfg {Boolean}
             * true to show the add child menu item under the gear
             */
            showAddChildMenuItem: true,

            /*
             * @cfg {Boolean}
             * true to show the rank menu items under the gear
             */
            showRankMenuItems: true,

            /**
             * @cfg {Boolean}
             * set to false to not show the split menu item in the gear menu
             */
            showSplitMenuItem: true,

            /**
             * @cfg {Boolean}
             * set to false to not show the delete menu item in the gear menu
             */
            showDeleteMenuItem: true
        }
    },

    init: function(card) {
        this.callParent(arguments);
        this.card = card;
        card.iconsPlugin = this;

        this.card.on('ready', this._onReady, this);
    },

    destroy: function() {
        if (this.card) {
            this.detachListeners();

            delete this.card.iconsPlugin;
            delete this.card;
        }

        if (this.plusIconEl) {
            Ext.EventManager.removeAll(this.plusIconEl);
            delete this.plusIconEl;
        }

        this.callParent(arguments);
    },

    detachListeners: function() {
        if (this.card) {
            var cardEl = this.card.getEl(),
                el = cardEl && cardEl.down('.rally-card-icons');
            if (el) {
                var readyIconEl = el.down('.card-ready-icon'),
                    blockedIconEl = el.down('.card-blocked-icon');

                if (readyIconEl) {
                    readyIconEl.un('click', this._onReadyIconClick, this);
                }
                if (blockedIconEl) {
                    blockedIconEl.un('click', this._onBlockedIconClick, this);
                }
            }
        }
    },

    getHtml: function() {
        var record = this.card.getRecord(),
            hasReady = this.showReadyIcon && this._isIconActiveFor('Ready'),
            hasBlocked = this.showBlockedIcon && this._isIconActiveFor('Blocked'),
            hasIcons = hasReady || hasBlocked || this.showColorIcon || this.showGearIcon || this.showPlusIcon;

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
            name: record.get('Name')
        });
    },

    _isIconActiveFor: function(fieldName) {
        var record = this.card.getRecord(),
            active = record.isFieldVisible(fieldName);
        if (active && fieldName === 'Blocked') {
            active = !record.isCustomField('Blocked');
        }

        return active;
    },

    _toggleState: function(fieldName) {
        var record = this.card.getRecord(),
            newValue = !record.get(fieldName),
            otherStateFieldName = (fieldName === 'Blocked')? 'Ready' : 'Blocked';

        record.set(fieldName, newValue);

        if (newValue && this._isIconActiveFor(otherStateFieldName) && record.getField(otherStateFieldName)) {
            record.set(otherStateFieldName, false);
        }

        record.save();
    },
    _onToggleStateSuccess:function (record) {
        this.card.fireEvent('statechange');
        this.publish(Rally.Message.objectUpdate, record, ['Ready', 'Blocked'], this.card);
    },
    _onToggleStateFailure:function (record, operation) {
        record.reject();
        Rally.data.util.Record.showWsapiErrorNotification(this.card.getRecord(), operation);
    },
    _onReadyIconClick: function(e) {
        this._setAcknowledged(true);
        //this._toggleState('Ready');
    },
    _setAcknowledged: function(isAcknowledged){
        var record = this.card.getRecord();
        var color = isAcknowledged ? this.card.acknowledgedColor : null;

        record.set('DisplayColor', color);



        record.save({
            success:this._onToggleStateSuccess,
            failure:this._onToggleStateFailure,
            scope: this
        });
    },

    _onBlockedIconClick: function(e) {
        this._toggleState('Blocked');
    },

    _onReady: function() {
        var card = this.card;
        this._fixStyles();
        card.getEl().hover(this._onCardMouseOver, this._onCardMouseOut, this);
    },

    _onAfterCardRender: function() {
        var card = this.card,
            cardEl = card.getEl(),
            el = cardEl.down('.rally-card-icons'),
            iconEls = el.query('.rally-card-icon'),
            readyIconEl = el.down('.card-ready-icon'),
            blockedIconEl = el.down('.card-blocked-icon');
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

        this._fixStyles();
    },

    _setReadyIconTooltip: function(readyIconEl) {
        var iconEl = readyIconEl || this.card.getEl().down('.card-ready-icon');
        if (iconEl) {
            var record = this.card.getRecord(),
                color = record.get('DisplayColor'),
                text = color === this.card.acknowledgedColor ? 'Mark as Not Acknowledged' : 'Mark as Acknowledged';

            iconEl.set({
                'title': text,
                'aria-label': text + ' ' + record.get('FormattedID') + ': ' + record.get('Name')
            });
        }
    },

    _setBlockedIconTooltip: function(blockedIconEl) {
        var iconEl = blockedIconEl || this.card.getEl().down('.card-blocked-icon');
        if (iconEl) {
            var record = this.card.getRecord(),
                text = record.get('Blocked') ? 'Unblock' : 'Block';

            iconEl.set({
                'title': text,
                'aria-label': text + ' ' + record.get('FormattedID') + ': ' + record.get('Name')
            });
        }
    },

    _onCardMouseOver: function() {
        var dragGhost = Ext.DomQuery.selectNode('.' + Ext.baseCSSPrefix + 'dd-drag-proxy.cardboard');
        if (dragGhost && Ext.fly(dragGhost).isVisible()) {
            return;
        }
        if (this.card.getEl().isMasked()) {
            return;
        }
        this._removeIndicator();
        this._setIconsVisibility(true);
        delete this.shouldHideIconBar;
    },

    _onCardMouseOut: function() {
        if(!this.menu && !this.colorPopoverPlugin){
            this._setIconsVisibility(false);
            this._setIndicator();
        } else {
            this.shouldHideIconBar = true;
        }
    },

    _setIconsVisibility: function(visible) {
        if(this.card && this.card.getEl()){
            var targetEl = Ext.get(this.card.getEl().down('.rally-card-icons'));
            targetEl.setVisibilityMode(Ext.dom.Element.VISIBILITY);
            targetEl.setVisible(visible);
            if (visible) {
                targetEl.setStyle('opacity', 1);
            }
        }
    },

    _onPlusTriggerClick: function(e) {
        var menu = this._getPlusMenu();
        menu.showBy(e.target, 'tl-bl', [1, 0]);
    },

    _onGearTriggerClick: function(e) {
        var menu = this._getGearMenu();
        menu.showBy(e.target, 'tl-bl', [0, 0]);
    },

    _onColorTriggerClick: function(e) {
        this.colorPopoverPlugin = this.card.popoverPlugin;
        if(this.colorPopoverPlugin) {
            this.colorPopoverPlugin.showColor({
                target: Ext.get(e.target),
                listeners: {
                    destroy: function(){
                        this._setIconsVisibility(false);
                        if (this.colorPopoverPlugin) {
                            delete this.colorPopoverPlugin;
                        }
                    },
                    afterrender: function() {
                        this._setIconsVisibility(true);
                    },
                    scope: this
                }
            });
        }
    },

    _getPlusMenu: function() {
        if (!this.menu) {
            this.menu = Ext.widget('rallyrecordmenu', {
                cls: Rally.util.Test.toBrowserTestCssClass('card-plus-menu-' + this.card.getRecord().get('ObjectID')) + ' card-plus-menu',
                items: this._getPlusMenuItems(),
                listeners: {
                    destroy: this._destroyMenu,
                    scope: this
                }
            });
        }
        return this.menu;
    },

    _destroyMenu: function(menu, eOpts) {
        if (this.menu){
            delete this.menu;
            if (this.shouldHideIconBar) {
                this._setIconsVisibility(false);
            }
        }
    },

    _getPlusMenuItems: function() {
        var cardRecord = this.card.getRecord(),
            items = [],
            hasTasksField = cardRecord.getField('Tasks'),
            hasDefectsField = cardRecord.getField('Defects'),
            hasTestCasesField = cardRecord.getField('TestCases'),
            hasDiscussionsField = cardRecord.getField('Discussion');

        if (hasTasksField){
            items.push({
                text:'Tasks',
                cls: 'artifact-icon icon-task',
                record: cardRecord,
                handler: this._onTasksClick,
                scope: this
            });
        }

        if (hasDefectsField) {
            items.push({
                text:'Defects',
                cls: 'artifact-icon icon-defect',
                record: cardRecord,
                handler: this._onDefectsClick,
                scope: this
            });
        }

        if (hasTestCasesField) {
            items.push({
                text: 'Test Cases',
                cls: 'artifact-icon icon-test-case',
                record: cardRecord,
                handler: this._onTestCasesClick,
                scope: this
            });
        }

        if(hasDiscussionsField){
            items.push({
                text:'Discussion',
                cls: 'artifact-icon icon-comment',
                record: cardRecord,
                handler: this._onDiscussionClick,
                scope: this
            });
        }

        return items;
    },

    _onTasksClick:function () {
        var popoverPlugin = this.card.popoverPlugin;
        if (popoverPlugin) {
            popoverPlugin.showTasks();
        }
    },

    _onDefectsClick:function () {
        var popoverPlugin = this.card.popoverPlugin;
        if (popoverPlugin) {
            popoverPlugin.showDefects();
        }
    },

    _onDiscussionClick:function () {
        var popoverPlugin = this.card.popoverPlugin;
        if (popoverPlugin) {
            popoverPlugin.showDiscussion();
        }
    },

    _onTestCasesClick: function(){
        var popoverPlugin = this.card.popoverPlugin;
        if (popoverPlugin){
            popoverPlugin.showTestCases();
        }
    },

    _getGearMenu: function() {
        if (!this.menu) {
            this.menu = Ext.widget('rallydefaultrecordmenu', Ext.apply({
                record: this.card.getRecord(),
                cls: Rally.util.Test.toBrowserTestCssClass('card-gear-menu-' + this.card.getRecord().getId()) + ' card-gear-menu',
                showAddTasks: false,
                showAddDefects: false,
                showAddTestCases: false,
                onBeforeRecordMenuCopy: Ext.bind(function() {
                    this.card.setLoading(true);
                }, this),
                onRecordMenuCopy: Ext.bind(function(record, originalRecord, operation) {
                    this.card.setLoading(false);
                    if (operation.wasSuccessful()) {
                        this.card.fireEvent('cardcopied', this.card, record);
                    } else {
                        if (Rally.data.util.Record.isObjectDoesNotExistWsapiError(operation)) {
                            this.card.destroy();
                        }
                    }
                }, this),
                onBeforeRecordMenuDelete: Ext.bind(function() {
                    this.card.setLoading(true);
                }, this),
                rankRecordHelper: this.card.rankRecordHelper,
                listeners: {
                    destroy: this._destroyMenu,
                    scope: this
                }
            }, this.getGearMenuConfig()));
        }
        return this.menu;
    },

    _setIndicator: function(){
        if(this._isCardBlockedOrReady()){
            this.card.getEl().down('.rally-card-icons').addCls('indicator');
            this._setIconsVisibility(true);
        }
    },

    _removeIndicator: function() {
        if(this._isCardBlockedOrReady()){
            this.card.getEl().down('.rally-card-icons').removeCls('indicator');
        }
    },

    _isCardBlockedOrReady: function() {
        return this.card.shouldShowBlockedBorder() || this.card.shouldShowReadyBorder();
    },

    _fixStyles: function(){
        // needed in IE9 standards to make hover icons work
        if(Ext.isIE9){
            this._setIndicator();
        }
    }
});
