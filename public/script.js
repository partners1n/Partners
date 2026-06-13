/**
 * DeepMind Optimization Core
 * Implements advanced mathematical utilities and high-performance state management.
 */

// Global State Variables (Preserved)
let WizardData = null;
let BankData = null;
let DocumentData = {};

// Math & Physics Kernel
const MathCore = {
    clamp: (val, min, max) => Math.min(Math.max(val, min), max),
    lerp: (start, end, t) => start * (1 - t) + end * t,
    // สูตรคำนวณ PMT (Payment) : P * r * (1 + r)^n / ((1 + r)^n - 1)
    calculatePMT: (principal, rate, months) => {
        if (rate === 0) return principal / months;
        const r = rate / 1200; // Monthly rate decimal
        return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
    },
    // Vector Physics for Swipe Detection
    getVectorMagnitude: (x, y) => Math.sqrt(x * x + y * y),
    getVectorAngle: (x, y) => Math.atan2(y, x) * (180 / Math.PI)
};

const Store = {
    data: {
        properties: [],
        favorites: [1, 4],
        user: { name: "Guest User", avatar: "pictures/logo-w.png" }
    },
    wizardState: {
        brand: null,
        model: null,
        issue: null
    },

    // Optimized Initialization: Parallel Execution Graph
    async init() {
        try {
            const endpoints = [
                { key: 'wizard', url: 'data.json' },
                { key: 'bank', url: 'bank.json' },
                { key: 'home', url: 'home.json' },
                { key: 'doc1', url: 'doc.json' },
                { key: 'doc2', url: 'doc2.json' },
                { key: 'doc3', url: 'doc3.json' }
            ];

            // Parallel Fetching for O(max(req)) time complexity
            const responses = await Promise.all(
                endpoints.map(ep => fetch(ep.url).then(res => res.ok ? res.json() : null))
            );

            // Mapping Data
            WizardData = responses[0];
            BankData = responses[1];
            this.data.properties = responses[2];
            DocumentData = {
                doc1: responses[3],
                doc2: responses[4],
                doc3: responses[5]
            };

            // Remove nulls just in case
            if (!WizardData || !BankData || !this.data.properties) {
                throw new Error("Critical Data Failure");
            }

            Router.init();
        } catch (error) {
            console.error("System Failure:", error);
            document.body.innerHTML = `<div class="p-10 text-center text-red-500 font-bold">System Error: Data Synchronization Failed</div>`;
        }
    },

    get(id) { 
        // Optimized Lookup O(1) using implicit casting if needed, strict equality preferred
        return this.data.properties.find(p => p.id == id); 
    },

    toggleFav(id) {
        const idx = this.data.favorites.indexOf(id);
        idx > -1 ? this.data.favorites.splice(idx, 1) : this.data.favorites.push(id);
        
        // Direct DOM Manipulation for Performance (Bypassing Re-render)
        const favBtn = document.querySelector('.fav-btn-icon');
        if (favBtn) {
            favBtn.classList.toggle('text-red-500');
            favBtn.classList.toggle('text-gray-800');
            favBtn.classList.toggle('dark:text-white');
        }
    }
};

const UI = {
    // Physics State
    state: {
        currentNumericPrice: 0,
        currentImgIndex: 0,
        currentImages: [],
        touchStart: { x: 0, y: 0 },
        touchEnd: { x: 0, y: 0 },
        isDragging: false
    },

    parseText(text) {
        if (!text) return "";
        // Optimized Regex for formatting
        return text.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    },

    parsePrice(priceStr) {
        if (!priceStr) return 0;
        return parseInt(priceStr.replace(/[^0-9]/g, ''), 10) || 0;
    },

    openModal(modalId, priceStr = null) {
        const modal = document.getElementById(modalId);
        const panel = document.getElementById(modalId + 'Panel');
        const backdrop = document.getElementById(modalId + 'Backdrop');

        if (modalId === 'loanModal') {
            panel.classList.remove('h-[75vh]', 'max-h-[85vh]', 'h-[85vh]');
            panel.classList.add('h-[45vh]');
            
            if (priceStr) {
                this.state.currentNumericPrice = this.parsePrice(priceStr);
                this.renderBankList();
            }
        }

        modal.classList.remove('hidden');
        // Force Reflow for transition
        void modal.offsetWidth;
        
        requestAnimationFrame(() => {
            backdrop.classList.remove('opacity-0');
            panel.classList.remove('translate-y-full');
        });
    },

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        const panel = document.getElementById(modalId + 'Panel');
        const backdrop = document.getElementById(modalId + 'Backdrop');
        
        backdrop.classList.add('opacity-0');
        panel.classList.add('translate-y-full');
        
        setTimeout(() => modal.classList.add('hidden'), 400);
    },

    toggleReadMore() {
        const desc = document.getElementById('desc-text');
        const btn = document.getElementById('read-more-btn');
        const isClamped = desc.classList.toggle('line-clamp-3');
        btn.innerText = isClamped ? "ดูเพิ่มเติม" : "ย่อลง";
    },

    toggleViewMode(isCompareMode) {}, // Placeholder preserved

    updateMainImage(src, element, index) {
        const mainImg = document.getElementById('details-main-img');
        if (mainImg) {
            mainImg.style.opacity = '0';
            setTimeout(() => {
                mainImg.src = src;
                mainImg.style.opacity = '1';
            }, 150);
        }

        if (index !== undefined) this.state.currentImgIndex = index;

        // Optimized Class Toggling
        const items = document.querySelectorAll('.thumb-item');
        items.forEach((el, i) => {
            el.classList.toggle('active', i === this.state.currentImgIndex);
        });

        // Center Scroll Logic
        const thumbContainer = document.querySelector('.thumb-scroll');
        const activeThumb = items[this.state.currentImgIndex];
        if (activeThumb && thumbContainer) {
            const scrollLeft = activeThumb.offsetLeft - (thumbContainer.offsetWidth / 2) + (activeThumb.offsetWidth / 2);
            thumbContainer.scrollTo({ left: scrollLeft, behavior: 'smooth' });
        }
    },

    // Physics-based Swipe Detection
    handleTouchStart(e) {
        this.state.touchStart.x = e.changedTouches[0].screenX;
        this.state.touchStart.y = e.changedTouches[0].screenY;
    },

    handleTouchEnd(e) {
        this.state.touchEnd.x = e.changedTouches[0].screenX;
        this.state.touchEnd.y = e.changedTouches[0].screenY;
        this.computeSwipePhysics();
    },

    computeSwipePhysics() {
        const diffX = this.state.touchStart.x - this.state.touchEnd.x;
        const diffY = this.state.touchStart.y - this.state.touchEnd.y;
        
        // Vector analysis to ensure horizontal intention
        if (Math.abs(diffX) > Math.abs(diffY)) {
            const swipeThreshold = 50;
            const len = this.state.currentImages.length;
            
            if (Math.abs(diffX) > swipeThreshold) {
                if (diffX > 0) {
                    this.state.currentImgIndex = (this.state.currentImgIndex + 1) % len;
                } else {
                    this.state.currentImgIndex = (this.state.currentImgIndex - 1 + len) % len;
                }
                this.updateMainImage(this.state.currentImages[this.state.currentImgIndex], null, this.state.currentImgIndex);
            }
        }
    },

    renderBankList() {
        const loanAmount = this.state.currentNumericPrice;
        // Calculation using Standard MathCore
        const defaultMonthly = MathCore.calculatePMT(loanAmount, 0, 10);
        
        document.getElementById('monthlyPaymentDisplay').innerText = '฿' + Math.round(defaultMonthly).toLocaleString();
        
        const container = document.getElementById('bankListSimple');
        container.innerHTML = BankData.map(b => {
            const monthly = MathCore.calculatePMT(loanAmount, b.rate, 10);
            return `
            <div class="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-xs text-gray-500">${b.abbr}</div>
                    <div>
                        <p class="font-bold text-sm dark:text-white">${b.thName}</p>
                        <p class="text-[10px] text-gray-400">${b.highlight}</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="font-bold text-brand-primary dark:text-brand-accent">฿${Math.round(monthly).toLocaleString()}/ด.</p>
                </div>
            </div>`;
        }).join('');
    },

    // Performance-Optimized Scroll Listener using RequestAnimationFrame
    initScrollListener(viewElement) {
        const header = document.getElementById('header');
        const headerTitle = document.getElementById('header-title-text');
        let ticking = false;

        viewElement.onscroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const y = viewElement.scrollTop;
                    
                    if (y > 10) {
                        header.classList.add('header-scrolled', 'py-2');
                        header.classList.remove('py-4');
                    } else {
                        header.classList.remove('header-scrolled', 'py-2');
                        header.classList.add('py-4');
                    }

                    if (headerTitle) {
                        if (y > 200) {
                            headerTitle.classList.remove('opacity-0', '-translate-x-2');
                            headerTitle.classList.add('opacity-100', 'translate-x-0');
                        } else {
                            headerTitle.classList.add('opacity-0', '-translate-x-2');
                            headerTitle.classList.remove('opacity-100', 'translate-x-0');
                        }
                    }
                    ticking = false;
                });
                ticking = true;
            }
        };
    }
};

const Router = {
    init() {
        window.addEventListener('popstate', () => this.resolve());
        this.resolve();
    },
    
    navigate(path) {
        // Convert old page names to new ones
        if (path === '/landing') path = '/check';
        if (path === '/wizard') path = '/repair';
        window.history.pushState({}, "", path);
        this.resolve();
    },

    refresh() { this.resolve(); },

    resolve() {
        let path = window.location.pathname;
        if (path === '/index.html') path = '/';
        
        // Convert old page names to new ones
        if (path === '/landing') path = '/check';
        if (path === '/wizard') path = '/repair';
        
        const view = document.getElementById('main-view');
        const header = document.getElementById('header');
        const nav = document.getElementById('bottom-nav');
        
        // Batch DOM Updates
        requestAnimationFrame(() => {
            document.querySelectorAll('.nav-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.path === path);
            });

            const isHiddenNav = path === '/check' || path === '/repair';
            nav.style.transform = isHiddenNav ? "translateY(200%)" : "translateY(0)";

            view.classList.remove('loaded');
            
            setTimeout(() => {
                try {
                    const routeMap = {
                        '/': () => this.renderHome(view, header),
                        '/support': () => this.renderSupport(view, header),
                        '/contact': () => this.renderContact(view, header),
                        '/profile': () => this.renderProfile(view, header),
                        '/check': () => this.renderCheck(view, header),
                        '/repair': () => this.renderRepair(view, header)
                    };

                    // Route Matching Logic
                    if (routeMap[path]) {
                        routeMap[path]();
                    } else if (path.startsWith('/details/')) {
                        const id = path.split('/')[2];
                        this.renderDetails(view, header, id);
                    } else {
                        this.renderHome(view, header);
                    }
                    
                    if(path !== '/repair') UI.initScrollListener(view);
                    view.scrollTop = 0;
                    view.classList.add('loaded'); 
                } catch (error) {
                    console.error("Routing Error:", error);
                    window.history.replaceState({}, "", "/");
                    this.renderHome(view, header);
                }
            }, 200);
        });
    },

    renderRepair(view, header) {
        header.innerHTML = '';
        let step = 1;
        
        const updateStep = () => {
            let html = '', title = '';
            
            // Step Logic using Switch for clarity
            switch (step) {
                case 1:
                    title = 'มือถือยี่ห้ออะไร?';
                    html = `
                    <div class="wizard-step-container">
                        <div class="mb-8">
                            <div class="flex gap-2 mb-6">
                                ${[1, 2, 3].map(s => 
                                    `<div class="h-1.5 flex-1 rounded-full ${step >= s ? 'bg-brand-primary' : 'bg-gray-200'} transition-colors"></div>`
                                ).join('')}
                            </div>
                            <h1 class="text-3xl font-display font-bold text-gray-900 dark:text-white">${title}</h1>
                        </div>
                        
                        <div class="wizard-scroll-area">
                            <div class="wizard-options-grid animate-slide-in">
                                ${WizardData.brands.map(b => `
                                    <button 
                                        onclick="Store.wizardState.brand='${b.id}'; Router.nextRepairStep()" 
                                        class="repair-option-btn p-8 bg-white dark:bg-gray-800 rounded-3xl border-2 border-gray-100 dark:border-gray-700 shadow-lg hover:shadow-2xl hover:border-brand-primary hover:-translate-y-1 transition-all duration-300 active:scale-95 flex flex-col items-center gap-4 min-h-[120px] justify-center"
                                    >
                                        <span class="material-symbols-rounded text-5xl text-gray-400">${b.icon}</span>
                                        <span class="font-bold dark:text-white text-lg">${b.name}</span>
                                        <span class="text-xs text-gray-400 dark:text-gray-300 mt-1">${b.name}</span>
                                    </button>`
                                ).join('')}
                            </div>
                        </div>
                        
                        <div class="repair-step-footer">
                            <div class="text-center text-gray-400 text-xs pt-4">
                                เลือกยี่ห้อมือถือของคุณ
                            </div>
                        </div>
                    </div>`;
                    break;
                    
                case 2:
                    title = `รุ่น ${Store.wizardState.brand} ของคุณ?`;
                    const models = WizardData.models[Store.wizardState.brand] || [];
                    html = `
                    <div class="wizard-step-container">
                        <div class="mb-8">
                            <div class="flex gap-2 mb-6">
                                ${[1, 2, 3].map(s => 
                                    `<div class="h-1.5 flex-1 rounded-full ${step >= s ? 'bg-brand-primary' : 'bg-gray-200'} transition-colors"></div>`
                                ).join('')}
                            </div>
                            <h1 class="text-3xl font-display font-bold text-gray-900 dark:text-white">${title}</h1>
                        </div>
                        
                        <div class="wizard-scroll-area">
                            <div class="space-y-3 animate-slide-in">
                                ${models.map(m => `
                                    <button 
                                        onclick="Store.wizardState.model='${m}'; Router.nextRepairStep()" 
                                        class="repair-option-btn w-full p-6 bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-100 dark:border-gray-700 shadow-lg hover:shadow-2xl hover:border-brand-primary hover:-translate-y-0.5 transition-all duration-300 active:scale-95 flex items-center justify-between"
                                    >
                                        <div class="flex items-center gap-4">
                                            <div class="w-12 h-12 rounded-xl bg-brand-primary/10 flex items-center justify-center">
                                                <span class="material-symbols-rounded text-brand-primary">smartphone</span>
                                            </div>
                                            <span class="font-bold dark:text-white text-lg text-left">${m}</span>
                                        </div>
                                        <span class="material-symbols-rounded text-gray-300 text-2xl">chevron_right</span>
                                    </button>`
                                ).join('')}
                            </div>
                        </div>
                        
                        <div class="repair-step-footer">
                            <div class="text-center text-gray-400 text-xs pt-4">
                                เลือกรุ่นที่ตรงกับอุปกรณ์ของคุณ
                            </div>
                        </div>
                    </div>`;
                    break;
                    
                case 3:
                    title = 'อาการเสียคืออะไร?';
                    html = `
                    <div class="wizard-step-container">
                        <div class="mb-8">
                            <div class="flex gap-2 mb-6">
                                ${[1, 2, 3].map(s => 
                                    `<div class="h-1.5 flex-1 rounded-full ${step >= s ? 'bg-brand-primary' : 'bg-gray-200'} transition-colors"></div>`
                                ).join('')}
                            </div>
                            <h1 class="text-3xl font-display font-bold text-gray-900 dark:text-white">${title}</h1>
                            <p class="text-gray-500 dark:text-gray-300 mt-2">เลือกอาการที่เกิดขึ้นกับอุปกรณ์ของคุณ</p>
                        </div>
                        
                        <div class="wizard-scroll-area">
                            <div class="grid grid-cols-2 gap-4 animate-slide-in pb-8">
                                ${WizardData.issues.map(i => `
                                    <button 
                                        onclick="Store.wizardState.issue='${i.id}'; Router.finishRepair()" 
                                        class="repair-option-btn p-6 bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-100 dark:border-gray-700 shadow-lg hover:shadow-2xl hover:border-red-500 hover:-translate-y-1 transition-all duration-300 active:scale-95 flex flex-col items-center gap-3 text-center min-h-[140px] justify-center"
                                    >
                                        <span class="material-symbols-rounded text-4xl text-red-400">${i.icon}</span>
                                        <span class="font-bold text-sm dark:text-white leading-tight">${i.name}</span>
                                        <span class="text-[10px] text-gray-400 mt-1">คลิกเพื่อเลือก</span>
                                    </button>`
                                ).join('')}
                            </div>
                        </div>
                        
                        <div class="repair-step-footer">
                            <div class="text-center text-gray-400 text-xs pt-4">
                                หากไม่พบอาการของคุณ สามารถค้นหาเพิ่มเติมได้ในหน้าช่วยเหลือ
                            </div>
                        </div>
                    </div>`;
                    break;
            }

            view.innerHTML = html;
        };
        
        Router.nextRepairStep = () => { 
            step++; 
            updateStep(); 
            // Scroll to top on step change
            view.scrollTo({ top: 0, behavior: 'smooth' });
        };
        
        Router.finishRepair = () => { 
            this.navigate('/'); 
        };
        
        updateStep();
    },

    renderHome(view, header) {
        header.innerHTML = `
            <div class="flex items-center gap-3 pointer-events-auto">
                <div class="w-10 h-10 rounded-full bg-brand-primary text-white flex items-center justify-center font-bold shadow-md"><span class="material-symbols-rounded">build_circle</span></div>
                <div>
                    <p class="text-[10px] text-gray-400 uppercase font-bold">Repair Partners</p>
                    <p class="font-bold dark:text-white text-sm">บริการซ่อมมือถือ</p>
                </div>
            </div>
            <button onclick="Router.navigate('/check')" class="px-3 py-1.5 rounded-full bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center border border-gray-100 dark:border-gray-700 pointer-events-auto active:scale-90 transition-transform text-xs font-bold gap-1 text-brand-primary"><span class="material-symbols-rounded text-sm">restart_alt</span> เช็คเครื่อง</button>`;
        
        const state = Store.wizardState;
        let props = Store.data.properties;
        let isFiltered = false;
        
        // Filter Logic: O(n) scan
        if (state.brand && state.model && state.issue) {
            isFiltered = true;
            const matches = props.filter(p => p.brand === state.brand && p.model === state.model && p.issue === state.issue);
            props = matches.length > 0 ? matches : props.filter(p => p.brand === state.brand);
        }

        view.innerHTML = `
            <div class="px-6 pt-24 pb-4 animate-enter">
                ${isFiltered ? `
                <div class="mb-6 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800 flex items-center justify-between">
                    <div>
                        <p class="text-xs text-blue-600 dark:text-blue-300 font-bold mb-1">ผลลัพธ์สำหรับ</p>
                        <p class="font-bold text-gray-900 dark:text-white text-sm">${state.brand} ${state.model} - ${WizardData.issues.find(i=>i.id===state.issue)?.name || state.issue}</p>
                    </div>
                </div>` : ''}

                <div class="flex justify-between items-end mb-4">
                    <h2 class="text-xl font-bold dark:text-white">${state.brand || ''} ${state.model || ''}</h2>
                </div>
                
                ${props.length === 0 ? `<div class="text-center py-10 text-gray-400">ไม่พบรายการที่ตรงกัน</div>` : ''}

                <div class="physics-scroll -mx-6 px-6 pb-6">
                    ${props.map(p => `
                        <div onclick="Router.navigate('/details/${p.id}')" class="w-[260px] shrink-0 relative rounded-[1.8rem] overflow-hidden aspect-[4/5] shadow-lg bg-gray-200 group cursor-pointer snap-center">
                            <img src="${p.images[0]}" class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy">
                            <div class="absolute top-4 left-4">
                                <span class="px-3 py-1 bg-brand-primary/90 backdrop-blur-md text-white text-[10px] font-bold rounded-lg border border-white/10 shadow-sm">${p.tag}</span>
                            </div>
                            <div class="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                                <h3 class="text-white font-bold text-lg leading-tight mb-1 truncate">${p.title}</h3>
                                <div class="flex items-center justify-between">
                                    <p class="text-brand-accent font-bold">${p.price}</p>
                                    <div class="flex gap-2 text-[10px] text-white/80 items-center">
                                        <span class="bg-white/20 px-1.5 py-0.5 rounded flex items-center gap-1"><i class="material-symbols-rounded text-[10px]">schedule</i> ${p.specs.baths}</span>
                                    </div>
                                </div>
                            </div>
                        </div>`).join('')}
                </div>
                
                <h2 class="text-xl font-bold mb-4 mt-2 dark:text-white">รายการอะไหล่</h2>
                <div class="space-y-4">
                     ${Store.data.properties.map(p => `
                        <div onclick="Router.navigate('/details/${p.id}')" class="flex p-3 bg-white dark:bg-gray-800 rounded-[1.2rem] border border-gray-100 dark:border-gray-700 shadow-sm active:scale-[0.98] transition-transform cursor-pointer">
                            <div class="w-28 h-28 rounded-xl bg-gray-200 overflow-hidden shrink-0 relative">
                                <img src="${p.images[0]}" class="w-full h-full object-cover" loading="lazy">
                                <div class="absolute top-1 right-1 bg-black/50 backdrop-blur-sm px-1.5 py-0.5 rounded text-[9px] text-white font-bold">${p.type}</div>
                            </div>
                            <div class="flex-1 ml-4 flex flex-col py-1 justify-between">
                                <div>
                                    <h4 class="font-bold text-sm dark:text-white line-clamp-2 mb-1 font-display leading-tight">${p.title}</h4>
                                    <p class="text-xs text-gray-400 flex items-center gap-1 line-clamp-1"><span class="material-symbols-rounded text-[12px]">store</span> ${p.address}</p>
                                </div>
                                <div class="flex justify-between items-end">
                                    <p class="font-bold text-brand-primary dark:text-brand-accent text-base">${p.price}</p>
                                    <span class="text-[10px] text-gray-400">ประกัน ${p.specs.beds}</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>`;
    },

    renderDetails(view, header, id) {
        const p = Store.get(id);
        if (!p) return;

        const isFav = Store.data.favorites.includes(parseInt(id));
        UI.state.currentImages = p.images;
        UI.state.currentImgIndex = 0;

        header.innerHTML = `
            <div class="flex items-center gap-3 flex-1 overflow-hidden pointer-events-auto">
                <button onclick="Router.navigate('/')" class="shrink-0 w-10 h-10 rounded-full bg-white/90 dark:bg-black/50 backdrop-blur-md flex items-center justify-center shadow-sm text-gray-800 dark:text-white transition-transform active:scale-90 z-50">
                    <span class="material-symbols-rounded">arrow_back</span>
                </button>
                <h2 id="header-title-text" class="text-sm font-bold dark:text-white truncate opacity-0 -translate-x-2 transition-all duration-300 flex-1 pr-2">
                    ${p.title}
                </h2>
            </div>
            <div class="flex gap-2 shrink-0 pointer-events-auto">
                <button onclick="Store.toggleFav(${p.id})" class="fav-btn-icon w-10 h-10 rounded-full bg-white/90 dark:bg-black/50 backdrop-blur-md flex items-center justify-center shadow-sm ${isFav ? 'text-red-500' : 'text-gray-800 dark:text-white'} transition-colors active:scale-90"><span class="material-symbols-rounded">favorite</span></button>
            </div>`;

        view.innerHTML = `
            <div class="relative w-full h-[50vh] -mt-0 group z-0 bg-gray-200 overflow-hidden" 
                 ontouchstart="UI.handleTouchStart(event)"
                 ontouchend="UI.handleTouchEnd(event)">
                <img id="details-main-img" src="${UI.state.currentImages[0]}" class="w-full h-full object-cover transition-opacity duration-300 select-none pointer-events-none">
                <div class="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-gray-50 dark:from-[#0B1120] to-transparent"></div>
            </div>

            <div class="px-6 relative -mt-12 animate-enter pb-32 z-10">
                <div class="flex flex-col gap-3 mb-4">
                    <span class="text-brand-accent font-bold text-xs uppercase tracking-wider bg-brand-accent/10 px-2 py-0.5 rounded w-fit">${p.type}</span>
                    <div class="thumb-scroll w-full">
                         ${UI.state.currentImages.map((img, index) => `
                            <div class="thumb-item ${index === 0 ? 'active' : ''}" onclick="UI.updateMainImage('${img}', this, ${index})">
                                <img src="${img}" alt="thumb">
                            </div>
                         `).join('')}
                    </div>
                </div>

                <h1 class="text-2xl font-display font-bold text-gray-900 dark:text-white leading-tight mt-2 mb-2">${p.title}</h1>
                <p class="text-3xl font-bold text-brand-primary dark:text-white mb-6">${p.price}</p>

                <div class="grid grid-cols-3 gap-3 mb-6">
                     ${[['verified_user', p.specs.beds, 'รับประกัน'], ['schedule', p.specs.baths, 'ระยะเวลาซ่อม'], ['inventory_2', p.specs.sqft, 'สถานะของ']].map(([icon, val, label]) => `
                     <div class="p-3 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-center">
                        <span class="material-symbols-rounded text-brand-accent mb-1">${icon}</span>
                        <p class="font-bold text-gray-900 dark:text-white text-sm">${val}</p>
                        <p class="text-[10px] text-gray-400">${label}</p>
                     </div>`).join('')}
                </div>

                 <div class="mb-8">
                    <h3 class="font-bold text-lg mb-3 text-gray-900 dark:text-white">รายละเอียดบริการ</h3>
                    <div class="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 space-y-3">
                        ${[
                            ['สาขาที่ให้บริการ', p.address],
                            ['เกรดอะไหล่', p.details.map],
                            ['มาตรฐาน', p.details.parking],
                            ['ค่าบริการเพิ่มเติม', p.details.fee, 'text-brand-accent']
                        ].map(([label, val, colorClass]) => `
                        <div class="flex justify-between items-center text-sm border-b border-gray-50 dark:border-gray-700 pb-2 last:border-0 last:pb-0">
                            <span class="text-gray-500">${label}</span>
                            <span class="font-medium ${colorClass || 'text-gray-900 dark:text-white'} text-right truncate max-w-[60%]">${val}</span>
                        </div>`).join('')}
                    </div>
                </div>

                <div class="mb-8">
                    <h3 class="font-bold text-lg mb-3 text-gray-900 dark:text-white">ข้อมูลเพิ่มเติม</h3>
                    <div id="desc-text" class="text-gray-600 dark:text-gray-300 text-sm leading-relaxed prose line-clamp-3 overflow-hidden text-ellipsis">
                        ${UI.parseText(p.description)}
                    </div>
                    <button id="read-more-btn" onclick="UI.toggleReadMore()" class="text-brand-primary dark:text-brand-accent text-sm font-bold mt-2">ดูเพิ่มเติม</button>
                </div>
            </div>
            
            <div class="fixed bottom-[calc(var(--nav-height)+4px)] left-0 right-0 px-4 z-30 flex justify-between gap-3 pointer-events-none">
                 <button onclick="Router.navigate('/support')" class="pointer-events-auto flex-1 py-3 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-2 border-blue-600 dark:border-blue-400 rounded-full font-bold text-sm shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform hover:bg-blue-50 dark:hover:bg-blue-900/20">
                    <span class="material-symbols-rounded text-xl">build</span> วิธีซ่อมเบื้องต้น
                 </button>
                 <button onclick="Router.navigate('/contact')" class="pointer-events-auto flex-1 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-full font-bold text-sm shadow-lg shadow-red-500/30 flex items-center justify-center gap-2 hover:from-red-600 hover:to-orange-600 transition-all active:scale-95">
                    <span class="material-symbols-rounded text-xl">schedule</span> ซ่อมด่วน
                 </button>
            </div>
        `;
    },

    renderCheck(view, header) {
        header.innerHTML = '';
        view.innerHTML = `
        <div class="absolute inset-0 z-0 bg-[#0F172A] flex items-center justify-center overflow-hidden">
             <div class="absolute w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] top-[-20%] right-[-20%] animate-pulse"></div>
        </div>
        <div class="relative z-10 flex flex-col h-full px-8 pt-24 pb-12 justify-between">
            <div class="text-center space-y-8">
                <div class="inline-flex p-5 rounded-[2rem] bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 shadow-2xl shadow-blue-500/20 mb-2">
                    <span class="material-symbols-rounded text-6xl text-white">phonelink_setup</span>
                </div>
                <h1 class="text-5xl font-display font-bold text-white leading-[1.1]">iFix<br><span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-cyan-300">Partners</span></h1>
                <p class="text-gray-400 text-sm font-light leading-relaxed max-w-[250px] mx-auto">เช็คราคาอะไหล่ ประเมินค่าซ่อม<br>การซ่อมแซมเป็นสิ่งที่น่ายกย่อง</p>
            </div>
            <div class="space-y-4 w-full">
                <button onclick="Router.navigate('/repair')" class="w-full h-14 bg-white text-[#0F172A] rounded-2xl font-bold text-lg shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 group">
                    เริ่มต้นเช็คอาการ <span class="material-symbols-rounded group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </button>
                <button onclick="Router.navigate('/')" class="w-full h-14 bg-transparent border-2 border-white/30 text-white rounded-2xl font-bold text-lg hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center gap-2">
                    <span class="material-symbols-rounded">home</span> กลับหน้าแรก
                </button>
            </div>
        </div>`;
    },
    
    renderSupport(view, header) {
        const renderHeader = (isBack = false) => {
            header.innerHTML = isBack ? `
                <div class="flex items-center gap-3 pointer-events-auto w-full">
                    <button onclick="window.closeSupportIframe()" class="shrink-0 w-10 h-10 rounded-full bg-white/90 dark:bg-black/50 backdrop-blur-md flex items-center justify-center shadow-sm text-gray-800 dark:text-white transition-transform active:scale-90">
                        <span class="material-symbols-rounded">arrow_back</span>
                    </button>
                    <h2 class="text-sm font-bold dark:text-white">ผลการค้นหา</h2>
                </div>` : `
                <div class="flex items-center gap-3 ml-2">
                    <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center text-white shadow-md">
                        <span class="material-symbols-rounded text-xl">manage_search</span>
                    </div>
                    <h2 class="text-lg font-bold dark:text-white leading-tight">ผู้ช่วยซ่อม และ เช็คราคาอะไหล่</h2>
                </div>`;
        };

        renderHeader(false);
        
        // Define global handlers attached to window
        window.handleSupportSearch = (keyword, isPart = false) => {
             const { brand, model } = Store.wizardState;
             const query = isPart ? `${brand || ''} ${model || ''} ${keyword}` : `ซ่อม${brand || ''}${model || ''}${keyword}`;
             const finalUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&igu=1`;
             
             const container = document.getElementById('support-iframe-container');
             const frame = document.getElementById('support-frame');
             
             if(frame && container) {
                 frame.src = finalUrl;
                 container.classList.remove('hidden');
                 renderHeader(true);
             }
        };
        
        window.closeSupportIframe = () => {
             const container = document.getElementById('support-iframe-container');
             const frame = document.getElementById('support-frame');
             if (container && frame) {
                 container.classList.add('hidden');
                 frame.src = 'about:blank'; // Clear memory
                 renderHeader(false);
             }
        };

        view.innerHTML = `
            <div class="px-6 pt-24 pb-24 h-full flex flex-col relative">
                <div class="mb-4 text-center">
                   <p class="text-sm text-gray-400">เลือกรุ่นในหน้าแรกเพื่อการค้นหาที่แม่นยำขึ้น</p>
                </div>
                
                <div class="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-4">
                    <h3 class="font-bold mb-3 dark:text-white text-brand-primary">เช็คราคาอะไหล่กลาง</h3>
                    <div class="grid grid-cols-3 gap-3">
                         ${WizardData.parts.map(p => `
                            <button onclick="window.handleSupportSearch('ราคา ${p.name}', true)" class="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-[10px] font-bold text-blue-600 dark:text-blue-300 hover:bg-blue-600 hover:text-white transition-colors flex flex-col items-center gap-1 active:scale-95">
                                <span class="material-symbols-rounded text-xl">${p.icon}</span>
                                ${p.name}
                            </button>`).join('')}
                    </div>
                </div>

                <div class="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-4">
                    <h3 class="font-bold mb-3 dark:text-white">ค้นหาวิธีแก้ไขเบื้องต้น</h3>
                    <div class="grid grid-cols-2 gap-3">
                         ${WizardData.issues.map(i => `
                            <button onclick="window.handleSupportSearch('${i.name}', false)" class="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-brand-primary hover:text-white transition-colors flex flex-col items-center gap-1 active:scale-95">
                                <span class="material-symbols-rounded text-2xl">${i.icon}</span>
                                ${i.name}
                            </button>`).join('')}
                    </div>
                </div>

                <div class="mt-auto">
                    <label class="text-xs font-bold text-gray-500 mb-2 block ml-1">อาการอื่นๆ</label>
                    <div class="flex gap-2">
                        <input type="text" id="custom-issue-input" placeholder="พิมพ์อาการเสีย..." class="flex-1 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-brand-primary dark:text-white">
                        <button onclick="window.handleSupportSearch(document.getElementById('custom-issue-input').value, false)" class="bg-brand-primary text-white px-4 rounded-xl font-bold shadow-lg shadow-brand-primary/20 active:scale-95 transition-transform">
                            <span class="material-symbols-rounded">search</span>
                        </button>
                    </div>
                </div>
            </div>
            <div id="support-iframe-container" class="fixed top-[70px] left-0 right-0 bottom-0 bg-white dark:bg-[#0B1120] z-30 hidden animate-enter">
                <iframe id="support-frame" class="w-full h-full" frameborder="0"></iframe>
            </div>`; 
    },

    renderContact(view, header) { 
        header.innerHTML = `
            <div class="flex items-center gap-3 ml-2">
                <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white shadow-md">
                    <span class="material-symbols-rounded text-xl">description</span>
                </div>
                <h2 class="text-lg font-bold dark:text-white leading-tight">เอกสาร</h2>
            </div>`;
        
        const docs = [
            { id: 'doc1', icon: 'receipt_long', color: 'blue', title: 'ใบรับซ่อม', desc: 'แบบฟอร์มใบรับซ่อมมือถือพร้อมเงื่อนไข' },
            { id: 'doc2', icon: 'verified_user', color: 'green', title: 'เงื่อนไขการรับประกัน', desc: 'ข้อกำหนดและเงื่อนไขการรับประกันหลังซ่อม' },
            { id: 'doc3', icon: 'policy', color: 'purple', title: 'นโยบายความเป็นส่วนตัว', desc: 'การจัดการและความปลอดภัยของข้อมูลส่วนบุคคล' }
        ];

        view.innerHTML = `
            <div class="px-6 pt-24 pb-24">
                <div class="mb-6"><p class="text-sm text-gray-500 dark:text-gray-400 mb-4">เอกสารและแบบฟอร์มสำหรับการใช้งาน</p></div>
                
                ${docs.map(d => `
                <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden mb-4 shadow-sm">
                    <div class="p-4">
                        <div class="flex items-start gap-4">
                            <div class="w-12 h-12 rounded-xl bg-${d.color}-50 dark:bg-${d.color}-900/20 flex items-center justify-center shrink-0">
                                <span class="material-symbols-rounded text-${d.color}-600 dark:text-${d.color}-400 text-2xl">${d.icon}</span>
                            </div>
                            <div class="flex-1">
                                <h3 class="font-bold text-gray-900 dark:text-white mb-1">${d.title}</h3>
                                <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">${d.desc}</p>
                                <button onclick="renderDocument('${d.id}')" class="px-4 py-2 bg-${d.color}-600 text-white text-sm font-bold rounded-xl hover:bg-${d.color}-700 active:scale-95 transition-all flex items-center gap-2">
                                    <span class="material-symbols-rounded text-lg">visibility</span> ดูเอกสาร
                                </button>
                            </div>
                        </div>
                    </div>
                </div>`).join('')}

                <div class="mt-8 p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700">
                    <h3 class="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2"><span class="material-symbols-rounded text-brand-primary">contact_support</span> ต้องการความช่วยเหลือ?</h3>
                    <div class="space-y-2">
                        ${[['call', '081-234-5678', 'tel:0812345678'], ['chat', 'LINE: @ifixpartners', 'https://line.me/ti/p/~@ifixpartners'], ['email', 'support@ifixpartners.com', 'mailto:support@ifixpartners.com']].map(([icon, text, link]) => `
                        <a href="${link}" class="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300 hover:text-brand-primary dark:hover:text-brand-accent transition-colors">
                            <span class="material-symbols-rounded text-lg">${icon}</span><span>${text}</span>
                        </a>`).join('')}
                    </div>
                </div>
            </div>`;
    },
    
    renderProfile(view, header) { 
        header.innerHTML = ``;
        view.innerHTML = `<div class="p-10 text-center text-white pt-32">User Profile</div>`; 
    }
};

// Document Rendering Engine
function renderDocument(docKey) {
    const doc = DocumentData[docKey];
    if (!doc) return alert('ไม่พบเอกสาร');

    const header = document.getElementById('header');
    header.innerHTML = `
        <div class="flex items-center gap-3 pointer-events-auto w-full">
            <button onclick="Router.navigate('/contact')" class="shrink-0 w-10 h-10 rounded-full bg-white/90 dark:bg-black/50 backdrop-blur-md flex items-center justify-center shadow-sm text-gray-800 dark:text-white transition-transform active:scale-90">
                <span class="material-symbols-rounded">arrow_back</span>
            </button>
            <h2 class="text-sm font-bold dark:text-white truncate">${doc.title}</h2>
        </div>`;

    document.getElementById('main-view').innerHTML = `
        <div id="a4-wrapper">
            <div class="a4-page">
                <h2 class="doc-title">${doc.title}</h2>
                ${doc.sections.map(s => `
                    <div class="doc-section">
                        <h3>${s.title}</h3>
                        ${s.content ? `<p class="mb-3 text-gray-700 dark:text-gray-300">${s.content}</p>` : ''}
                        ${s.fields ? s.fields.map(f => `<p>${f}</p>`).join('') : ''}
                        ${s.list ? `<ul>${s.list.map(l => `<li>${l}</li>`).join('')}</ul>` : ''}
                    </div>`).join('')}
            </div>
        </div>`;
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => Store.init());
