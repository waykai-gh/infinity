    (function(){
        // Простая проверка доступности UTIF
        function ensureUTIFLoaded(timeout = 3000){
            return new Promise((res, rej)=>{
                const start = Date.now();
                (function check(){
                    if(window.UTIF) return res();
                    if(Date.now()-start > timeout) return rej(new Error('UTIF.js не загрузился')); 
                    setTimeout(check, 50);
                })();
            });
        }

        class Converter{
            constructor(){
                this.map = new Map();
                this.fileCounter = 0;
                this.init();
            }

            async init(){
                try{
                    await ensureUTIFLoaded();
                }catch(e){
                    alert('Ошибка: UTIF.js не загружен. Проверьте подключение библиотеки.');
                    console.error(e);
                    return;
                }
                this.bind();
            }

            bind(){
                this.uploadArea = document.getElementById('uploadArea');
                this.input = document.getElementById('fileInput');
                this.fileList = document.getElementById('fileList');
                this.controls = document.getElementById('controls');
                this.convertAllBtn = document.getElementById('convertAllBtn');
                this.clearAllBtn = document.getElementById('clearAllBtn');

                this.uploadArea.addEventListener('click', ()=> this.input.click());
                this.input.addEventListener('change', (e)=> this.addFiles(e.target.files));
                this.uploadArea.addEventListener('dragover', (e)=> { e.preventDefault(); this.uploadArea.style.opacity = .9 });
                this.uploadArea.addEventListener('dragleave', ()=> { this.uploadArea.style.opacity = 1 });
                this.uploadArea.addEventListener('drop', (e)=>{ e.preventDefault(); this.addFiles(e.dataTransfer.files); this.uploadArea.style.opacity = 1 });

                this.convertAllBtn.addEventListener('click', ()=> this.convertAll());
                this.clearAllBtn.addEventListener('click', ()=> this.clearAll());
            }

            addFiles(fileList){
                const files = Array.from(fileList).filter(f => f.type === 'image/jpeg' || f.name.match(/\.jpe?g$/i));
                files.forEach(f => this.addFile(f));
                this.updateControls();
            }

            addFile(file){
                // id: uuid if available, otherwise incremental
                const id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'f'+(Date.now())+''+(++this.fileCounter);
                const item = { id, file, status: 'pending', converted: null, error: null };
                this.map.set(id, item);
                this.renderItem(item);
            }

            renderItem(item){
                let el = document.getElementById('file-'+item.id);
                if(!el){
                    el = document.createElement('div'); el.id = 'file-'+item.id; el.className='file-item';
                    this.fileList.appendChild(el);
                }

                // build inner content
                el.innerHTML = '';
                const left = document.createElement('div'); left.className='file-details';
                const name = document.createElement('div'); name.className='file-name'; name.textContent = item.file.name;
                const size = document.createElement('div'); size.className='file-size'; size.textContent = (item.file.size/1024).toFixed(1) + ' KB';
                left.appendChild(name); left.appendChild(size);

                const right = document.createElement('div'); right.style.display='flex'; right.style.alignItems='center'; right.style.gap='10px';
                const status = document.createElement('span'); status.className = 'status-badge status-'+item.status; status.textContent = this.statusText(item.status);
                right.appendChild(status);

                if(item.status === 'completed'){
                    const dl = document.createElement('button'); dl.className='btn btn-success'; dl.textContent='Скачать'; dl.addEventListener('click', ()=> this.download(item.id)); right.appendChild(dl);
                }

                const rem = document.createElement('button'); rem.className='btn btn-danger'; rem.textContent='✕'; rem.addEventListener('click', ()=> this.remove(item.id)); right.appendChild(rem);

                if(item.error){
                    const err = document.createElement('div'); err.className='error-text'; err.textContent = item.error; right.appendChild(err);
                }

                el.appendChild(left); el.appendChild(right);
            }

            statusText(s){
                return ({pending:'Ожидает', converting:'Конвертация...', completed:'Готово', error:'Ошибка'})[s] || s;
            }

            updateControls(){
                this.controls.style.display = this.map.size ? 'flex' : 'none';
            }

            async convertAll(){
                for(const [id,item] of this.map){
                    if(item.status === 'pending'){
                        // convert sequentially to avoid spikes — you can change to parallel if you want
                        await this.convertOne(id);
                    }
                }
            }

            async convertOne(id){
                const item = this.map.get(id);
                if(!item) return;
                item.status = 'converting'; item.error = null; this.renderItem(item);

                try{
                    const img = await this.loadImageFromFile(item.file);
                    // draw on canvas
                    const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
                    const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0);
                    const imageData = ctx.getImageData(0,0,canvas.width,canvas.height);

                    // make a copy of pixels to a new ArrayBuffer exactly sized for the image
                    const rgba = new Uint8Array(imageData.data); // this copies data into a new buffer

                    // encode with UTIF
                    let tiffArrayBuffer;
                    try{
                        tiffArrayBuffer = UTIF.encodeImage(rgba.buffer, canvas.width, canvas.height);
                    }catch(e){
                        // fallback: try building a simple IFD and use UTIF.encode
                        console.warn('UTIF.encodeImage failed, falling back to UTIF.encode', e);
                        const ifd = {
                            t256: [canvas.width],
                            t257: [canvas.height],
                            t258: [8,8,8,8],
                            t259: [1], // no compression
                            t262: [2], // RGB
                            t273: [8],
                            t277: [4],
                            t278: [canvas.height],
                            t279: [rgba.length],
                            t282: [72], t283: [72], t284: [1], t296: [2], t338: [1],
                            data: rgba
                        };
                        tiffArrayBuffer = UTIF.encode([ifd]);
                    }

                    const blob = new Blob([tiffArrayBuffer], {type: 'image/tiff'});
                    item.converted = blob;
                    item.status = 'completed';
                }catch(err){
                    console.error('Conversion error for', item.file.name, err);
                    item.status = 'error';
                    item.error = (err && err.message) ? err.message : 'Неизвестная ошибка';
                }
                this.renderItem(item);
            }

            loadImageFromFile(file){
                return new Promise((res, rej)=>{
                    const url = URL.createObjectURL(file);
                    const img = new Image();
                    img.onload = ()=>{ URL.revokeObjectURL(url); res(img) };
                    img.onerror = (e)=>{ URL.revokeObjectURL(url); rej(new Error('Не удалось загрузить изображение (возможно повреждён файл)')); };
                    img.src = url;
                });
            }

            download(id){
                const item = this.map.get(id);
                if(!item || !item.converted) return;
                const url = URL.createObjectURL(item.converted);
                const a = document.createElement('a');
                a.href = url; a.download = item.file.name.replace(/\.jpe?g$/i,'.tiff');
                document.body.appendChild(a); a.click(); a.remove();
                URL.revokeObjectURL(url);
            }

            remove(id){
                this.map.delete(id);
                const el = document.getElementById('file-'+id); if(el) el.remove();
                this.updateControls();
            }

            clearAll(){
                this.map.clear(); this.fileList.innerHTML = '';
                this.updateControls();
            }
        }

        // expose converter for console debugging if needed
        window.converter = new Converter();
    })();