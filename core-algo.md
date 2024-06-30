function processCommand(command) {
    saveToHistory(command)
    { existingTools, newTools, packages, useSingleTool, toolName, params } = analyzeRequestPrompt(command)
    memory = getMemory(command)
    if( useSingleTool ) {
        for(retry=0; retry<3; retry++) {
            try {
                runTool({ toolName, params })
            } 
            catch(e) {
                toolName = attemptToFix(e, command, toolName, params)
            }
        }
        return { success: true }
    } else {
        if( packages || newTools ) {
            emit('installPackages', { packages }).then(() => {
                createTools({ tools: newTools }).then(() => {
                    emit('processCommand', command)
                })
            })
            return { success: true }
        } else {
            if(shouldDecompose(command)) {
                emit('decomposeCommand', command).then((decomposedCommands) => {
                    decomposedCommands.forEach((decomposedCommand) => {
                        emit('processCommand', decomposedCommand)
                    })
                })
                return { success: true }
            }
            createScript(command, existingTools).then((script) => {
                for(retry=0; retry<3; retry++) {
                    runScript(script).then(() => {
                        emit('evaluatePotentialTool', script).then((tool) => {
                            if(!tool) {
                                emit('deleteScript', script)
                            } else {
                                emit('saveAsTool', script)
                            }
                            memory = createFormattedMemory(script, memory)
                            emit('saveMemory', memory)
                        })
                    }).catch((e) => {
                        toolName = attemptToFix(e, command, toolName, params)
                    })
                }
            })
            return { success: true }
        }
    }
}