
    /**
     * @private
     * A plugin to allow a cardboard column to collapse and expand itself
     */
    Ext.override(Rally.ui.cardboard.plugin.CollapsibleColumns, {

        _collapseExpandSuccess: function(collapsing) {
            this.cardboard.fireEvent('headersizechanged', this);
            this.cardboard.fireEvent('columnvisibilitychanged', this);

            if (collapsing) {
                this.expandButton.show();
                if (this.column.dropControllerPlugin){
                    this.column.dropControllerPlugin.disable();
                }

                Ext.defer(function() {
                    _.invoke(this.column.getContentCellContainers(), 'on', 'click', this._onColumnClick, this);
                    this.column.getColumnHeaderCell().on('click', this._onColumnClick, this);
                }, 1, this);

            } else {
                this.collapseButton.show();
                _.invoke(this.column.getContentCells(), 'show');
                if (this.column.dropControllerPlugin){
                    this.column.dropControllerPlugin.enable();
                }

                this._setClassesForCollapseState(false);
                _.invoke(this.column.getContentCellContainers(), 'un', 'click', this._onColumnClick, this);
                this.column.getColumnHeaderCell().un('click', this._onColumnClick, this);
            }
        }
    });
