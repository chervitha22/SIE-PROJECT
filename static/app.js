const API_BASE = "";

class GroceryApp {
    constructor() {
        this.token = localStorage.getItem("token") || null;
        this.user = JSON.parse(localStorage.getItem("user") || "null");
        this.stores = [];
        this.monthlyLists = [];
        this.orders = [];
        this.activeCustTab = 'lists';
        this.activeShopTab = 'orders';
        this.currentPricingOrder = null;

        this.init();
    }

    init() {
        this.updateAuthUI();
        if (this.user) {
            if (this.user.role === 'customer') {
                this.showCustomerView();
            } else if (this.user.role === 'shopkeeper') {
                this.showShopkeeperView();
            }
        } else {
            this.showHome();
        }
    }

    // --- AUTHENTICATION & HEADERS ---
    updateAuthUI() {
        const userInfoHeader = document.getElementById("userInfoHeader");
        const userRoleBadge = document.getElementById("userRoleBadge");
        const userNameHeader = document.getElementById("userNameHeader");
        const authBtn = document.getElementById("authBtn");
        const logoutBtn = document.getElementById("logoutBtn");

        if (this.user && this.token) {
            userInfoHeader.classList.remove("hidden");
            userInfoHeader.classList.add("flex");
            userNameHeader.textContent = this.user.name;
            userRoleBadge.textContent = this.user.role;
            if (this.user.role === 'shopkeeper') {
                userRoleBadge.className = "text-xs font-bold px-2 py-0.5 rounded-full bg-teal-700 text-white uppercase";
            } else {
                userRoleBadge.className = "text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white uppercase";
            }
            authBtn.classList.add("hidden");
            logoutBtn.classList.remove("hidden");
        } else {
            userInfoHeader.classList.add("hidden");
            authBtn.classList.remove("hidden");
            logoutBtn.classList.add("hidden");
        }
    }

    showHome() {
        document.getElementById("guestView").classList.remove("hidden");
        document.getElementById("customerView").classList.add("hidden");
        document.getElementById("shopkeeperView").classList.add("hidden");
    }

    async quickLogin(email) {
        try {
            const res = await fetch(`${API_BASE}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email, password: "password123" })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || "Login failed");
            
            this.token = data.access_token;
            this.user = data.user;
            localStorage.setItem("token", this.token);
            localStorage.setItem("user", JSON.stringify(this.user));

            this.showToast(`Logged in as ${this.user.name} (${this.user.role})`);
            this.updateAuthUI();

            if (this.user.role === 'customer') {
                this.showCustomerView();
            } else {
                this.showShopkeeperView();
            }
        } catch (err) {
            this.showToast(err.message, "error");
        }
    }

    logout() {
        this.token = null;
        this.user = null;
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        this.updateAuthUI();
        this.showHome();
        this.showToast("Logged out successfully");
    }

    openAuthModal() {
        document.getElementById("authModal").classList.remove("hidden");
    }

    toggleAuthTab(tab) {
        const loginForm = document.getElementById("loginForm");
        const registerForm = document.getElementById("registerForm");
        const tabLogin = document.getElementById("authTabLogin");
        const tabReg = document.getElementById("authTabReg");

        if (tab === 'login') {
            loginForm.classList.remove("hidden");
            registerForm.classList.add("hidden");
            tabLogin.className = "flex-1 py-1.5 text-xs font-bold rounded-lg bg-white shadow-sm text-slate-900";
            tabReg.className = "flex-1 py-1.5 text-xs font-bold rounded-lg text-slate-500";
        } else {
            loginForm.classList.add("hidden");
            registerForm.classList.remove("hidden");
            tabReg.className = "flex-1 py-1.5 text-xs font-bold rounded-lg bg-white shadow-sm text-slate-900";
            tabLogin.className = "flex-1 py-1.5 text-xs font-bold rounded-lg text-slate-500";
        }
    }

    toggleRegShopFields() {
        const role = document.getElementById("regRole").value;
        const shopFields = document.getElementById("regShopkeeperFields");
        if (role === 'shopkeeper') {
            shopFields.classList.remove("hidden");
        } else {
            shopFields.classList.add("hidden");
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById("loginEmail").value;
        const password = document.getElementById("loginPassword").value;

        try {
            const res = await fetch(`${API_BASE}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || "Login failed");

            this.token = data.access_token;
            this.user = data.user;
            localStorage.setItem("token", this.token);
            localStorage.setItem("user", JSON.stringify(this.user));

            this.closeModal("authModal");
            this.updateAuthUI();
            this.showToast(`Welcome back, ${this.user.name}!`);

            if (this.user.role === 'customer') {
                this.showCustomerView();
            } else {
                this.showShopkeeperView();
            }
        } catch (err) {
            this.showToast(err.message, "error");
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        const role = document.getElementById("regRole").value;
        const body = {
            name: document.getElementById("regName").value,
            email: document.getElementById("regEmail").value,
            password: document.getElementById("regPassword").value,
            role: role,
            phone: document.getElementById("regPhone").value,
            address: document.getElementById("regAddress")?.value || "",
            shop_name: document.getElementById("regShopName")?.value || "",
            upi_id: document.getElementById("regUpiId")?.value || ""
        };

        try {
            const res = await fetch(`${API_BASE}/api/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || "Registration failed");

            this.token = data.access_token;
            this.user = data.user;
            localStorage.setItem("token", this.token);
            localStorage.setItem("user", JSON.stringify(this.user));

            this.closeModal("authModal");
            this.updateAuthUI();
            this.showToast("Account created successfully!");

            if (this.user.role === 'customer') {
                this.showCustomerView();
            } else {
                this.showShopkeeperView();
            }
        } catch (err) {
            this.showToast(err.message, "error");
        }
    }

    // --- CUSTOMER DASHBOARD & WORKFLOW ---
    showCustomerView() {
        document.getElementById("guestView").classList.add("hidden");
        document.getElementById("shopkeeperView").classList.add("hidden");
        document.getElementById("customerView").classList.remove("hidden");

        this.loadMonthlyLists();
        this.loadStores();
        this.loadCustomerOrders();
    }

    switchCustTab(tab) {
        this.activeCustTab = tab;
        const btnLists = document.getElementById("tabCustLists");
        const btnStores = document.getElementById("tabCustStores");
        const btnOrders = document.getElementById("tabCustOrders");

        const secLists = document.getElementById("custListsSection");
        const secStores = document.getElementById("custStoresSection");
        const secOrders = document.getElementById("custOrdersSection");

        [btnLists, btnStores, btnOrders].forEach(b => {
            b.className = "pb-3 text-sm font-semibold text-slate-500 hover:text-slate-800 flex items-center space-x-2";
        });
        [secLists, secStores, secOrders].forEach(s => s.classList.add("hidden"));

        if (tab === 'lists') {
            btnLists.className = "pb-3 text-sm font-bold text-emerald-600 border-b-2 border-emerald-600 flex items-center space-x-2";
            secLists.classList.remove("hidden");
        } else if (tab === 'stores') {
            btnStores.className = "pb-3 text-sm font-bold text-emerald-600 border-b-2 border-emerald-600 flex items-center space-x-2";
            secStores.classList.remove("hidden");
        } else if (tab === 'orders') {
            btnOrders.className = "pb-3 text-sm font-bold text-emerald-600 border-b-2 border-emerald-600 flex items-center space-x-2 relative";
            secOrders.classList.remove("hidden");
            this.loadCustomerOrders();
        }
    }

    async loadMonthlyLists() {
        try {
            const res = await fetch(`${API_BASE}/api/lists`, {
                headers: { "Authorization": `Bearer ${this.token}` }
            });
            if (!res.ok) return;
            this.monthlyLists = await res.json();
            this.renderMonthlyLists();
        } catch (err) {
            console.error("Error loading monthly lists", err);
        }
    }

    renderMonthlyLists() {
        const grid = document.getElementById("monthlyListsGrid");
        if (!this.monthlyLists.length) {
            grid.innerHTML = `
                <div class="col-span-full bg-white p-8 rounded-2xl text-center border border-dashed border-slate-300">
                    <i class="fa-solid fa-basket-shopping text-3xl text-slate-300 mb-2"></i>
                    <h3 class="font-bold text-slate-700">No Monthly Grocery Lists Saved</h3>
                    <p class="text-xs text-slate-500 mt-1">Create your standard monthly ration template to quickly place orders to shopkeepers.</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = this.monthlyLists.map(list => `
            <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:border-emerald-300 transition">
                <div>
                    <div class="flex justify-between items-start">
                        <h3 class="font-bold text-slate-900 text-lg">${this.escape(list.title)}</h3>
                        <div class="flex items-center space-x-1">
                            <button onclick="app.editMonthlyList(${list.id})" class="text-slate-400 hover:text-emerald-600 text-xs p-1">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                            <button onclick="app.deleteMonthlyList(${list.id})" class="text-slate-400 hover:text-rose-600 text-xs p-1">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <p class="text-xs text-slate-500 mt-1">${this.escape(list.description || 'Monthly Ration Template')}</p>
                    
                    <div class="mt-4 pt-3 border-t border-slate-100 space-y-1 max-h-36 overflow-y-auto">
                        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Included Items (${list.items.length})</span>
                        ${list.items.map(item => `
                            <div class="flex justify-between text-xs py-0.5">
                                <span class="font-medium text-slate-700">${this.escape(item.item_name)}</span>
                                <span class="font-bold text-emerald-700">${item.quantity} ${item.unit}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <button onclick="app.prepareOrderFromList(${list.id})" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 rounded-xl transition flex items-center justify-center space-x-2 shadow-sm">
                    <i class="fa-solid fa-paper-plane"></i>
                    <span>Order from List</span>
                </button>
            </div>
        `).join('');
    }

    openCreateListModal() {
        document.getElementById("listModalTitle").textContent = "Create New Monthly Grocery List";
        document.getElementById("listTitleInput").value = "";
        document.getElementById("listDescInput").value = "";
        const container = document.getElementById("listItemsRows");
        container.innerHTML = "";
        this.addListRow("Aashirvaad Atta", 10, "kg");
        this.addListRow("Sunflower Oil", 5, "L");
        document.getElementById("monthlyListModal").classList.remove("hidden");
    }

    addListRow(name = "", qty = 1, unit = "kg", notes = "") {
        const container = document.getElementById("listItemsRows");
        const rowId = "lrow_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4);
        const div = document.createElement("div");
        div.className = "flex items-center space-x-2 bg-slate-50 p-2 rounded-xl border border-slate-200";
        div.id = rowId;
        div.innerHTML = `
            <input type="text" placeholder="Item Name (e.g. Rice, Sugar)" value="${this.escape(name)}" class="item-name flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 outline-none">
            <input type="number" step="0.5" placeholder="Qty" value="${qty}" class="item-qty w-16 text-xs px-2 py-1.5 rounded-lg border border-slate-300 outline-none font-bold">
            <select class="item-unit text-xs px-2 py-1.5 rounded-lg border border-slate-300 outline-none bg-white font-semibold">
                <option value="kg" ${unit === 'kg' ? 'selected' : ''}>kg</option>
                <option value="g" ${unit === 'g' ? 'selected' : ''}>g</option>
                <option value="L" ${unit === 'L' ? 'selected' : ''}>L</option>
                <option value="ml" ${unit === 'ml' ? 'selected' : ''}>ml</option>
                <option value="packet" ${unit === 'packet' ? 'selected' : ''}>packet</option>
                <option value="piece" ${unit === 'piece' ? 'selected' : ''}>piece</option>
                <option value="bottle" ${unit === 'bottle' ? 'selected' : ''}>bottle</option>
                <option value="box" ${unit === 'box' ? 'selected' : ''}>box</option>
            </select>
            <button type="button" onclick="document.getElementById('${rowId}').remove()" class="text-rose-500 hover:text-rose-700 text-xs px-2">
                <i class="fa-solid fa-trash"></i>
            </button>
        `;
        container.appendChild(div);
    }

    async saveMonthlyList() {
        const title = document.getElementById("listTitleInput").value;
        const description = document.getElementById("listDescInput").value;
        const rows = document.querySelectorAll("#listItemsRows > div");

        const items = [];
        rows.forEach(r => {
            const name = r.querySelector(".item-name").value.trim();
            const qty = parseFloat(r.querySelector(".item-qty").value) || 1;
            const unit = r.querySelector(".item-unit").value;
            if (name) {
                items.push({ item_name: name, quantity: qty, unit: unit });
            }
        });

        if (!title.trim()) {
            return this.showToast("Please enter a list title", "error");
        }
        if (!items.length) {
            return this.showToast("Please add at least one item", "error");
        }

        try {
            const res = await fetch(`${API_BASE}/api/lists`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.token}`
                },
                body: JSON.stringify({ title, description, items })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || "Failed to save list");

            this.closeModal("monthlyListModal");
            this.showToast("Monthly List saved successfully!");
            this.loadMonthlyLists();
        } catch (err) {
            this.showToast(err.message, "error");
        }
    }

    async deleteMonthlyList(id) {
        if (!confirm("Are you sure you want to delete this monthly list?")) return;
        try {
            const res = await fetch(`${API_BASE}/api/lists/${id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${this.token}` }
            });
            if (!res.ok) throw new Error("Could not delete list");
            this.showToast("List deleted");
            this.loadMonthlyLists();
        } catch (err) {
            this.showToast(err.message, "error");
        }
    }

    async loadStores() {
        try {
            const res = await fetch(`${API_BASE}/api/stores`);
            if (!res.ok) return;
            this.stores = await res.json();
            this.renderStores();
        } catch (err) {
            console.error("Error loading stores", err);
        }
    }

    renderStores() {
        const grid = document.getElementById("storesGrid");
        if (!this.stores.length) {
            grid.innerHTML = `<p class="col-span-full text-slate-500 text-center py-6">No shopkeepers found.</p>`;
            return;
        }

        grid.innerHTML = this.stores.map(s => `
            <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:border-teal-300 transition">
                <div>
                    <div class="flex items-center space-x-3">
                        <div class="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-lg">
                            <i class="fa-solid fa-store"></i>
                        </div>
                        <div>
                            <h3 class="font-bold text-slate-900">${this.escape(s.shop_name)}</h3>
                            <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">Pincode: ${s.area_pincode || 'Local'}</span>
                        </div>
                    </div>
                    <div class="mt-3 text-xs text-slate-600 space-y-1">
                        <p><i class="fa-solid fa-user text-slate-400 mr-1.5"></i> ${this.escape(s.owner_name)}</p>
                        <p><i class="fa-solid fa-location-dot text-slate-400 mr-1.5"></i> ${this.escape(s.address)}</p>
                        <p><i class="fa-solid fa-phone text-slate-400 mr-1.5"></i> ${this.escape(s.phone)}</p>
                        <p><i class="fa-solid fa-qrcode text-emerald-600 mr-1.5"></i> UPI ID: <span class="font-mono font-bold text-emerald-700">${this.escape(s.upi_id)}</span></p>
                    </div>
                </div>

                <button onclick="app.openOrderModalForStore(${s.id})" class="w-full bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold py-2.5 rounded-xl transition flex items-center justify-center space-x-2 shadow-sm">
                    <i class="fa-solid fa-cart-plus"></i>
                    <span>Place Remote Order</span>
                </button>
            </div>
        `).join('');
    }

    filterStores() {
        const pincode = document.getElementById("pincodeSearch").value.trim().toLowerCase();
        if (!pincode) {
            this.renderStores();
            return;
        }
        const filtered = this.stores.filter(s => (s.area_pincode || "").toLowerCase().includes(pincode));
        const grid = document.getElementById("storesGrid");
        if (!filtered.length) {
            grid.innerHTML = `<p class="col-span-full text-slate-500 text-center py-6">No stores matching pincode ${pincode}</p>`;
            return;
        }
        const temp = this.stores;
        this.stores = filtered;
        this.renderStores();
        this.stores = temp;
    }

    prepareOrderFromList(listId) {
        const list = this.monthlyLists.find(l => l.id === listId);
        if (!list) return;

        // Switch to Stores tab so customer can choose shopkeeper
        this.switchCustTab('stores');
        this.showToast(`Selected "${list.title}". Choose a nearby Kirana store below to send this list!`);

        this.pendingListOrder = list;
    }

    openOrderModalForStore(shopId) {
        const shop = this.stores.find(s => s.id === shopId);
        document.getElementById("orderShopId").value = shopId;
        document.getElementById("orderTargetShopName").textContent = shop ? shop.shop_name : "Selected Kirana Store";
        document.getElementById("orderDeliveryAddress").value = this.user ? (this.user.address || "") : "";
        document.getElementById("orderNotes").value = "";

        const container = document.getElementById("orderItemsRows");
        container.innerHTML = "";

        if (this.pendingListOrder && this.pendingListOrder.items.length) {
            this.pendingListOrder.items.forEach(item => {
                this.addOrderRow(item.item_name, item.quantity, item.unit);
            });
            document.getElementById("orderNotes").value = `Ordered from Monthly List: ${this.pendingListOrder.title}`;
            this.pendingListOrder = null;
        } else {
            this.addOrderRow("Aashirvaad Whole Wheat Atta", 10, "kg");
            this.addOrderRow("Fortune Sunflower Oil", 5, "L");
        }

        document.getElementById("createOrderModal").classList.remove("hidden");
    }

    addOrderRow(name = "", qty = 1, unit = "kg") {
        const container = document.getElementById("orderItemsRows");
        const rowId = "orow_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4);
        const div = document.createElement("div");
        div.className = "flex items-center space-x-2 bg-slate-50 p-2 rounded-xl border border-slate-200";
        div.id = rowId;
        div.innerHTML = `
            <input type="text" placeholder="Item Name" value="${this.escape(name)}" class="o-name flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 outline-none">
            <input type="number" step="0.5" placeholder="Qty" value="${qty}" class="o-qty w-16 text-xs px-2 py-1.5 rounded-lg border border-slate-300 outline-none font-bold">
            <select class="o-unit text-xs px-2 py-1.5 rounded-lg border border-slate-300 outline-none bg-white font-semibold">
                <option value="kg" ${unit === 'kg' ? 'selected' : ''}>kg</option>
                <option value="g" ${unit === 'g' ? 'selected' : ''}>g</option>
                <option value="L" ${unit === 'L' ? 'selected' : ''}>L</option>
                <option value="ml" ${unit === 'ml' ? 'selected' : ''}>ml</option>
                <option value="packet" ${unit === 'packet' ? 'selected' : ''}>packet</option>
                <option value="piece" ${unit === 'piece' ? 'selected' : ''}>piece</option>
                <option value="bottle" ${unit === 'bottle' ? 'selected' : ''}>bottle</option>
            </select>
            <button type="button" onclick="document.getElementById('${rowId}').remove()" class="text-rose-500 hover:text-rose-700 text-xs px-2">
                <i class="fa-solid fa-trash"></i>
            </button>
        `;
        container.appendChild(div);
    }

    async submitRemoteOrder() {
        const shopId = parseInt(document.getElementById("orderShopId").value);
        const deliveryAddress = document.getElementById("orderDeliveryAddress").value.trim();
        const notes = document.getElementById("orderNotes").value.trim();
        const rows = document.querySelectorAll("#orderItemsRows > div");

        const items = [];
        rows.forEach(r => {
            const name = r.querySelector(".o-name").value.trim();
            const qty = parseFloat(r.querySelector(".o-qty").value) || 1;
            const unit = r.querySelector(".o-unit").value;
            if (name) {
                items.push({ item_name: name, requested_quantity: qty, requested_unit: unit });
            }
        });

        if (!deliveryAddress) return this.showToast("Please enter delivery address", "error");
        if (!items.length) return this.showToast("Please add at least one grocery item", "error");

        try {
            const res = await fetch(`${API_BASE}/api/orders`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.token}`
                },
                body: JSON.stringify({ shop_id: shopId, delivery_address: deliveryAddress, notes, items })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || "Order placement failed");

            this.closeModal("createOrderModal");
            this.showToast("Order submitted! The shopkeeper will add prices & QR link.");
            this.switchCustTab("orders");
        } catch (err) {
            this.showToast(err.message, "error");
        }
    }

    async loadCustomerOrders() {
        if (!this.user || this.user.role !== 'customer') return;
        try {
            const res = await fetch(`${API_BASE}/api/orders`, {
                headers: { "Authorization": `Bearer ${this.token}` }
            });
            if (!res.ok) return;
            this.orders = await res.json();
            this.renderCustomerOrders();
        } catch (err) {
            console.error("Error loading customer orders", err);
        }
    }

    renderCustomerOrders() {
        const container = document.getElementById("customerOrdersList");
        const badge = document.getElementById("custOrderBadge");

        const activeCount = this.orders.filter(o => ['PENDING_PRICE', 'PRICED', 'PAYMENT_PENDING'].includes(o.status)).length;
        if (activeCount > 0) {
            badge.textContent = activeCount;
            badge.classList.remove("hidden");
        } else {
            badge.classList.add("hidden");
        }

        if (!this.orders.length) {
            container.innerHTML = `
                <div class="bg-white p-8 rounded-2xl text-center border border-slate-200">
                    <i class="fa-solid fa-receipt text-3xl text-slate-300 mb-2"></i>
                    <h3 class="font-bold text-slate-700">No Orders Placed Yet</h3>
                    <p class="text-xs text-slate-500 mt-1">Select a shopkeeper or use your Monthly Ration List to place your first remote order.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.orders.map(o => {
            let statusBadge = "";
            let statusMsg = "";
            let actionBtn = "";

            if (o.status === 'PENDING_PRICE') {
                statusBadge = `<span class="px-2.5 py-1 rounded-full badge-pending text-xs font-bold"><i class="fa-solid fa-clock mr-1"></i> Waiting for Shopkeeper Pricing</span>`;
                statusMsg = `<p class="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200"><i class="fa-solid fa-circle-info mr-1"></i> The shopkeeper is inspecting your list to set final item unit prices.</p>`;
            } else if (o.status === 'PRICED') {
                statusBadge = `<span class="px-2.5 py-1 rounded-full badge-priced text-xs font-bold"><i class="fa-solid fa-calculator mr-1"></i> Price Quote Ready (₹${o.total_amount.toFixed(2)})</span>`;
                statusMsg = `<p class="text-xs text-sky-800 bg-sky-50 p-2.5 rounded-xl border border-sky-200"><i class="fa-solid fa-qrcode mr-1"></i> Final total is <strong>₹${o.total_amount.toFixed(2)}</strong>. Click below to view bill breakdown & pay via UPI QR Code.</p>`;
                actionBtn = `<button onclick="app.openPaymentQrModal(${o.id})" class="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition flex items-center space-x-2 shadow-md">
                                <i class="fa-solid fa-qrcode"></i>
                                <span>Pay ₹${o.total_amount.toFixed(2)} via UPI QR</span>
                             </button>`;
            } else if (o.status === 'PAID') {
                statusBadge = `<span class="px-2.5 py-1 rounded-full badge-paid text-xs font-bold"><i class="fa-solid fa-circle-check mr-1"></i> Payment Ref Submitted</span>`;
                statusMsg = `<p class="text-xs text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200"><i class="fa-solid fa-check-double mr-1"></i> Ref: <span class="font-mono font-bold">${o.payment_ref}</span>. Shopkeeper is verifying payment for dispatch.</p>`;
            } else if (o.status === 'DELIVERED') {
                statusBadge = `<span class="px-2.5 py-1 rounded-full badge-delivered text-xs font-bold"><i class="fa-solid fa-box-open mr-1"></i> Completed & Fulfilled</span>`;
            }

            return `
                <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
                    <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-100 pb-3">
                        <div>
                            <span class="text-xs font-bold text-slate-400">Order #${o.id} • ${new Date(o.created_at).toLocaleDateString()}</span>
                            <h3 class="font-bold text-slate-900 text-base">${this.escape(o.shop_name)}</h3>
                        </div>
                        <div>${statusBadge}</div>
                    </div>

                    ${statusMsg}

                    <div class="space-y-1">
                        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Requested Items</span>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            ${o.items.map(i => `
                                <div class="flex justify-between bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs">
                                    <span class="font-medium text-slate-800">${this.escape(i.item_name)}</span>
                                    <span class="font-bold text-slate-600">${i.requested_quantity} ${i.requested_unit} ${i.unit_price ? `(₹${i.unit_price}/${i.requested_unit})` : ''}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    ${actionBtn}
                </div>
            `;
        }).join('');
    }

    // --- SHOPKEEPER DASHBOARD & PRICING WORKFLOW ---
    showShopkeeperView() {
        document.getElementById("guestView").classList.add("hidden");
        document.getElementById("customerView").classList.add("hidden");
        document.getElementById("shopkeeperView").classList.remove("hidden");

        this.loadShopkeeperProfile();
        this.loadShopkeeperOrders();
    }

    switchShopTab(tab) {
        this.activeShopTab = tab;
        const tabOrders = document.getElementById("tabShopOrders");
        const tabHistory = document.getElementById("tabShopHistory");

        if (tab === 'orders') {
            tabOrders.className = "pb-3 text-sm font-bold text-teal-700 border-b-2 border-teal-700 flex items-center space-x-2";
            tabHistory.className = "pb-3 text-sm font-semibold text-slate-500 hover:text-slate-800 flex items-center space-x-2";
        } else {
            tabHistory.className = "pb-3 text-sm font-bold text-teal-700 border-b-2 border-teal-700 flex items-center space-x-2";
            tabOrders.className = "pb-3 text-sm font-semibold text-slate-500 hover:text-slate-800 flex items-center space-x-2";
        }
        this.renderShopkeeperOrders();
    }

    async loadShopkeeperProfile() {
        try {
            const res = await fetch(`${API_BASE}/api/stores/my-shop/profile`, {
                headers: { "Authorization": `Bearer ${this.token}` }
            });
            if (!res.ok) return;
            const shop = await res.json();
            document.getElementById("shopNameTitle").textContent = shop.shop_name;
            document.getElementById("shopDetailSubtitle").innerHTML = `Owner: ${shop.owner_name} | UPI ID: <span class="font-mono bg-teal-900/50 px-2 py-0.5 rounded text-teal-300">${shop.upi_id}</span>`;
            document.getElementById("shopUpiDisplay").textContent = shop.upi_id;
            this.shopProfile = shop;
        } catch (err) {
            console.error("Error loading shop profile", err);
        }
    }

    async loadShopkeeperOrders() {
        try {
            const res = await fetch(`${API_BASE}/api/orders`, {
                headers: { "Authorization": `Bearer ${this.token}` }
            });
            if (!res.ok) return;
            this.orders = await res.json();
            this.renderShopkeeperOrders();
        } catch (err) {
            console.error("Error loading shopkeeper orders", err);
        }
    }

    renderShopkeeperOrders() {
        const container = document.getElementById("shopkeeperOrdersList");
        const pendingBadge = document.getElementById("shopPendingCount");

        const pendingList = this.orders.filter(o => o.status === 'PENDING_PRICE');
        pendingBadge.textContent = pendingList.length;

        let displayOrders = [];
        if (this.activeShopTab === 'orders') {
            displayOrders = this.orders.filter(o => ['PENDING_PRICE', 'PRICED', 'PAYMENT_PENDING', 'PAID'].includes(o.status));
        } else {
            displayOrders = this.orders.filter(o => o.status === 'DELIVERED');
        }

        if (!displayOrders.length) {
            container.innerHTML = `
                <div class="bg-white p-8 rounded-2xl text-center border border-slate-200">
                    <i class="fa-solid fa-box-open text-3xl text-slate-300 mb-2"></i>
                    <h3 class="font-bold text-slate-700">No Orders in this View</h3>
                    <p class="text-xs text-slate-500 mt-1">Incoming customer remote orders will appear here for price quotes and payment verification.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = displayOrders.map(o => {
            let statusBadge = "";
            let actionButtons = "";

            if (o.status === 'PENDING_PRICE') {
                statusBadge = `<span class="px-2.5 py-1 rounded-full badge-pending text-xs font-bold"><i class="fa-solid fa-clock mr-1"></i> Requires Pricing</span>`;
                actionButtons = `<button onclick="app.openPricingDeskModal(${o.id})" class="bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold py-2 px-4 rounded-xl transition flex items-center space-x-2 shadow-sm">
                                    <i class="fa-solid fa-calculator"></i>
                                    <span>Set Prices & Send Quote</span>
                                 </button>`;
            } else if (o.status === 'PRICED') {
                statusBadge = `<span class="px-2.5 py-1 rounded-full badge-priced text-xs font-bold">Quote Sent (₹${o.total_amount.toFixed(2)})</span>`;
                actionButtons = `<span class="text-xs text-slate-500">Waiting for customer to scan QR code & pay...</span>`;
            } else if (o.status === 'PAID') {
                statusBadge = `<span class="px-2.5 py-1 rounded-full badge-paid text-xs font-bold"><i class="fa-solid fa-money-bill-check mr-1"></i> Paid (Ref: ${o.payment_ref})</span>`;
                actionButtons = `<button onclick="app.markOrderDelivered(${o.id})" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-4 rounded-xl transition flex items-center space-x-2 shadow-sm">
                                    <i class="fa-solid fa-truck-ramp-box"></i>
                                    <span>Mark Order Delivered / Completed</span>
                                 </button>`;
            } else if (o.status === 'DELIVERED') {
                statusBadge = `<span class="px-2.5 py-1 rounded-full badge-delivered text-xs font-bold">Delivered</span>`;
            }

            return `
                <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
                    <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-100 pb-3">
                        <div>
                            <span class="text-xs font-bold text-slate-400">Order #${o.id} • ${new Date(o.created_at).toLocaleDateString()}</span>
                            <h3 class="font-bold text-slate-900 text-base">Customer: ${this.escape(o.customer_name)} (${this.escape(o.customer_phone || 'No phone')})</h3>
                            <p class="text-xs text-slate-500"><i class="fa-solid fa-location-dot text-slate-400 mr-1"></i> ${this.escape(o.delivery_address)}</p>
                        </div>
                        <div>${statusBadge}</div>
                    </div>

                    <div class="space-y-1">
                        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Items List</span>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            ${o.items.map(i => `
                                <div class="flex justify-between bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs">
                                    <span class="font-medium text-slate-800">${this.escape(i.item_name)}</span>
                                    <span class="font-bold text-slate-700">${i.requested_quantity} ${i.requested_unit} ${i.unit_price ? `(₹${i.unit_price}/${i.requested_unit})` : ''}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="flex justify-end pt-2 border-t border-slate-100">
                        ${actionButtons}
                    </div>
                </div>
            `;
        }).join('');
    }

    openPricingDeskModal(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) return;
        this.currentPricingOrder = order;

        document.getElementById("pricingOrderId").value = orderId;
        document.getElementById("pricingOrderSubtitle").textContent = `Order #${order.id} | Customer: ${order.customer_name} (${order.customer_phone || 'N/A'})`;
        document.getElementById("pricingCustomerAddress").textContent = order.delivery_address;
        document.getElementById("pricingDeliveryFee").value = 20;

        const container = document.getElementById("pricingItemsList");
        container.innerHTML = order.items.map(item => `
            <div class="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs pitem-row" data-item-id="${item.id}">
                <div class="col-span-4 font-semibold text-slate-800">${this.escape(item.item_name)}</div>
                <div class="col-span-2 text-center font-bold text-slate-600">${item.requested_quantity} ${item.requested_unit}</div>
                <div class="col-span-3">
                    <input type="number" step="1" min="0" value="${item.unit_price || 60}" oninput="app.recalculateShopTotals()" class="u-price w-full text-xs px-2 py-1 rounded-lg border border-slate-300 font-bold outline-none">
                </div>
                <div class="col-span-3 text-right font-extrabold text-teal-800 line-total-val">₹0.00</div>
            </div>
        `).join('');

        this.recalculateShopTotals();
        document.getElementById("pricingModal").classList.remove("hidden");
    }

    recalculateShopTotals() {
        const rows = document.querySelectorAll(".pitem-row");
        let subtotal = 0;

        rows.forEach(r => {
            const reqQtyText = r.querySelector(".col-span-2").textContent;
            const qty = parseFloat(reqQtyText) || 1;
            const uPrice = parseFloat(r.querySelector(".u-price").value) || 0;
            const lineTotal = qty * uPrice;
            r.querySelector(".line-total-val").textContent = `₹${lineTotal.toFixed(2)}`;
            subtotal += lineTotal;
        });

        const deliveryFee = parseFloat(document.getElementById("pricingDeliveryFee").value) || 0;
        const grandTotal = subtotal + deliveryFee;

        document.getElementById("pricingSubtotalDisplay").textContent = `₹${subtotal.toFixed(2)}`;
        document.getElementById("pricingGrandTotalDisplay").textContent = `₹${grandTotal.toFixed(2)}`;
    }

    async saveOrderPricing() {
        const orderId = parseInt(document.getElementById("pricingOrderId").value);
        const deliveryFee = parseFloat(document.getElementById("pricingDeliveryFee").value) || 0;
        const rows = document.querySelectorAll(".pitem-row");

        const items = [];
        rows.forEach(r => {
            const itemId = parseInt(r.getAttribute("data-item-id"));
            const uPrice = parseFloat(r.querySelector(".u-price").value) || 0;
            items.push({ item_id: itemId, unit_price: uPrice, available: true });
        });

        try {
            const res = await fetch(`${API_BASE}/api/orders/${orderId}/price`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.token}`
                },
                body: JSON.stringify({ delivery_fee: deliveryFee, items })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || "Failed to update pricing");

            this.closeModal("pricingModal");
            this.showToast("Prices saved & dynamic UPI QR Code generated for customer!");
            this.loadShopkeeperOrders();
        } catch (err) {
            this.showToast(err.message, "error");
        }
    }

    async openPaymentQrModal(orderId) {
        try {
            const res = await fetch(`${API_BASE}/api/orders/${orderId}`, {
                headers: { "Authorization": `Bearer ${this.token}` }
            });
            if (!res.ok) throw new Error("Could not fetch order details");
            const order = await res.json();

            document.getElementById("qrOrderId").value = order.id;
            document.getElementById("qrShopTitle").textContent = `${order.shop_name} (${order.shop_phone})`;
            document.getElementById("qrUpiString").textContent = `UPI ID: ${order.shop_upi_id}`;
            document.getElementById("qrAmountDisplay").textContent = `₹${order.total_amount.toFixed(2)}`;
            document.getElementById("qrImageElement").src = order.qr_code_data;
            document.getElementById("paymentRefInput").value = "";

            const billItems = document.getElementById("qrBillItems");
            billItems.innerHTML = order.items.map(i => `
                <div class="flex justify-between border-b border-slate-200 pb-1">
                    <span>${this.escape(i.item_name)} (${i.requested_quantity} ${i.requested_unit} x ₹${i.unit_price})</span>
                    <span class="font-bold">₹${i.item_total.toFixed(2)}</span>
                </div>
            `).join('') + `
                <div class="flex justify-between font-semibold text-slate-600 pt-1">
                    <span>Delivery Charges</span>
                    <span>₹${order.delivery_fee.toFixed(2)}</span>
                </div>
            `;

            document.getElementById("qrPaymentModal").classList.remove("hidden");
        } catch (err) {
            this.showToast(err.message, "error");
        }
    }

    async confirmPaymentSubmitted() {
        const orderId = parseInt(document.getElementById("qrOrderId").value);
        const ref = document.getElementById("paymentRefInput").value.trim();
        if (!ref) {
            return this.showToast("Please enter the UTR / Transaction Reference Number", "error");
        }

        try {
            const res = await fetch(`${API_BASE}/api/orders/${orderId}/pay`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.token}`
                },
                body: JSON.stringify({ payment_ref: ref })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || "Payment submission failed");

            this.closeModal("qrPaymentModal");
            this.showToast("Payment reference submitted to shopkeeper!");
            this.loadCustomerOrders();
        } catch (err) {
            this.showToast(err.message, "error");
        }
    }

    async markOrderDelivered(orderId) {
        try {
            const res = await fetch(`${API_BASE}/api/orders/${orderId}/status`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.token}`
                },
                body: JSON.stringify({ status: "DELIVERED" })
            });
            if (!res.ok) throw new Error("Status update failed");

            this.showToast("Order marked as Delivered & Completed");
            this.loadShopkeeperOrders();
        } catch (err) {
            this.showToast(err.message, "error");
        }
    }

    // --- SHOPPROFILE MODAL ---
    openShopProfileModal() {
        if (!this.shopProfile) return;
        document.getElementById("profShopName").value = this.shopProfile.shop_name;
        document.getElementById("profOwnerName").value = this.shopProfile.owner_name;
        document.getElementById("profUpiId").value = this.shopProfile.upi_id;
        document.getElementById("profPhone").value = this.shopProfile.phone;
        document.getElementById("profPincode").value = this.shopProfile.area_pincode || "";
        document.getElementById("profAddress").value = this.shopProfile.address;

        document.getElementById("shopProfileModal").classList.remove("hidden");
    }

    async saveShopProfile() {
        const body = {
            shop_name: document.getElementById("profShopName").value,
            owner_name: document.getElementById("profOwnerName").value,
            upi_id: document.getElementById("profUpiId").value,
            phone: document.getElementById("profPhone").value,
            area_pincode: document.getElementById("profPincode").value,
            address: document.getElementById("profAddress").value
        };

        try {
            const res = await fetch(`${API_BASE}/api/stores/my-shop/profile`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.token}`
                },
                body: JSON.stringify(body)
            });
            if (!res.ok) throw new Error("Failed to save shop settings");

            this.closeModal("shopProfileModal");
            this.showToast("Shop Profile & UPI settings updated!");
            this.loadShopkeeperProfile();
        } catch (err) {
            this.showToast(err.message, "error");
        }
    }

    // --- UTILS ---
    closeModal(id) {
        document.getElementById(id).classList.add("hidden");
    }

    showToast(msg, type = "success") {
        const toast = document.getElementById("toast");
        const msgEl = document.getElementById("toastMsg");
        const iconEl = document.getElementById("toastIcon");

        msgEl.textContent = msg;
        if (type === "error") {
            iconEl.className = "fa-solid fa-triangle-exclamation text-rose-400 text-lg";
        } else {
            iconEl.className = "fa-solid fa-circle-check text-emerald-400 text-lg";
        }

        toast.classList.remove("hidden");
        setTimeout(() => toast.classList.add("hidden"), 4000);
    }

    escape(str) {
        if (!str) return '';
        return String(str).replace(/[&<>"']/g, function(m) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
        });
    }
}

const app = new GroceryApp();
