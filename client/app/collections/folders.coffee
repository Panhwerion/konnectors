

module.exports = class FolderCollection extends Backbone.Collection
    model: require '../models/folder'
    url: 'folders/'


    # Order folders by full path (root path + folder name)
    comparator: (a, b) ->
        a.getFullPath().localeCompare b.getFullPath()


    # Return the list of all folder paths.
    getAllPaths: ->
        @models.map (model) ->
            model.getFullPath()
