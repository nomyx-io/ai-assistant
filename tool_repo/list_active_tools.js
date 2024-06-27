class ListActiveTools {
    name = "list_active_tools";
    description = "List all the active tools in the current session.";
    methodSignature = "list_active_tools(): string[]";

    execute(params, api) {
        return Object.keys(api.tools);
    }
}

module.exports = ListActiveTools;