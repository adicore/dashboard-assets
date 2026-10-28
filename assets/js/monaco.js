require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' }});

window.MonacoEnvironment = {
    getWorkerUrl: function(workerId, label) {
        return `data:text/javascript;charset=utf-8,${encodeURIComponent(`
            self.MonacoEnvironment = { baseUrl: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/' };
            importScripts('https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs/base/worker/workerMain.js');
        `)}`;
    }
};

window.initMonacoEditor = function(textareaSelector, language = 'html') {
    const textarea = document.querySelector(textareaSelector);
    if (!textarea) return;

    textarea.style.display = 'none';
    let container = document.getElementById('monaco-container-wrapper');
    if (!container) {
        container = document.createElement('div');
        container.id = 'monaco-container-wrapper';
        container.style.flexGrow = '1';
        container.style.height = '100%';
        container.style.width = '100%';
        textarea.parentNode.insertBefore(container, textarea);
    }

    require(['vs/editor/editor.main'], function() {
        if (window.currentMonacoInstance) {
            window.currentMonacoInstance.setValue(textarea.value);
            monaco.editor.setModelLanguage(window.currentMonacoInstance.getModel(), language);
            setTimeout(() => {
                window.currentMonacoInstance.layout();
            }, 150);
            return;
        }

        window.currentMonacoInstance = monaco.editor.create(container, {
            value: textarea.value,
            language: language,
            theme: 'vs-dark',
            automaticLayout: true,
            folding: true,
            minimap: { enabled: false },
            fontSize: 13,
            wordWrap: 'on'
        });

        window.currentMonacoInstance.onDidChangeModelContent(() => {
            textarea.value = window.currentMonacoInstance.getValue();
        });
    });
};