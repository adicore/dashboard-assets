window.currentCodeMirrorInstance = null;
window.initCodeMirrorEditor = function(selector, mode = 'htmlmixed') {
    const textarea = document.querySelector(selector);
    if (!textarea) return;

    if (window.currentCodeMirrorInstance) {
        window.currentCodeMirrorInstance.setValue(textarea.value || '');
        window.currentCodeMirrorInstance.setOption("mode", mode);
        window.currentCodeMirrorInstance.refresh();
        return;
    }

    // Inisialisasi instance CodeMirror baru DENGAN fitur Expand/Collapse
    window.currentCodeMirrorInstance = CodeMirror.fromTextArea(textarea, {
        lineNumbers: true,
        mode: mode,
        theme: "default", // Ubah jadi "dracula" jika ingin tema gelap yang sudah Anda panggil di CSS
        lineWrapping: true,
        autoCloseTags: true,
        autoCloseBrackets: true,
        
        // --- FITUR EXPAND/COLLAPSE (FOLDING) DITAMBAHKAN DI SINI ---
        foldGutter: true,
        gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"]
    });

    // Trik Bulletproof untuk layout Flexbox
    const wrapper = window.currentCodeMirrorInstance.getWrapperElement();
    wrapper.style.position = 'absolute';
    wrapper.style.top = '0';
    wrapper.style.bottom = '0';
    wrapper.style.left = '0';
    wrapper.style.right = '0';
    wrapper.style.height = 'auto';
    wrapper.style.width = 'auto';

    setTimeout(() => {
        window.currentCodeMirrorInstance.refresh();
        window.currentCodeMirrorInstance.focus();
    }, 50);
};