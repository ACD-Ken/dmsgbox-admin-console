/**
 * DMsgBox Admin Console - Device Management
 * 
 * Handles admin authentication, device listing, and revocation.
 * Integrates with Supabase for data management and RLS-protected operations.
 */

const { client: supabase, checkAdminSession, signInUrl } = window.dmsgboxAdmin;

// State
let currentUser = null;
let allDevices = [];
let selectedDeviceId = null;

// DOM Elements
const loginPanel = document.getElementById('loginPanel');
const mainContent = document.getElementById('mainContent');
const logoutBtn = document.getElementById('logoutBtn');
const refreshBtn = document.getElementById('refreshBtn');
const searchInput = document.getElementById('searchInput');
const filterStatus = document.getElementById('filterStatus');
const errorAlert = document.getElementById('errorAlert');
const successAlert = document.getElementById('successAlert');
const devicesTableBody = document.getElementById('devicesTableBody');
const emptyState = document.getElementById('emptyState');
const loadingState = document.getElementById('loadingState');
const revokeModal = document.getElementById('revokeModal');
const detailModal = document.getElementById('detailModal');

// ============================================
// Authentication
// ============================================

/**
 * Handle logout
 */
logoutBtn.addEventListener('click', async () => {
    try {
        const { error } = await supabase.auth.signOut({ scope: 'local' });
        if (error) throw error;
        currentUser = null;
        allDevices = [];
        showLoginPanel();
    } catch (error) {
        showError(`Logout failed: ${error.message}`);
    }
});

// ============================================
// Device Management
// ============================================

/**
 * Load all devices for admin view
 */
async function loadDevices() {
    try {
        showLoading('mainContent');

        // Use RLS-protected device listing
        const { data, error } = await supabase
            .from('devices')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            if (error.message.includes('permission')) {
                throw new Error('Permission denied. Only admins can view all devices.');
            }
            throw error;
        }

        allDevices = data || [];
        updateStats();
        renderDevices(allDevices);
        showSuccess(`Loaded ${allDevices.length} devices`);
    } catch (error) {
        showError(`Failed to load devices: ${error.message}`);
        renderEmptyState();
    } finally {
        hideLoading('mainContent');
    }
}

/**
 * Filter and search devices
 */
function filterDevices() {
    let filtered = allDevices;

    // Filter by status
    const status = filterStatus.value;
    if (status === 'active') {
        filtered = filtered.filter(d => !d.is_revoked);
    } else if (status === 'revoked') {
        filtered = filtered.filter(d => d.is_revoked);
    }

    // Search by device name or ID
    const query = searchInput.value.toLowerCase();
    if (query) {
        filtered = filtered.filter(d =>
            d.device_name?.toLowerCase().includes(query) ||
            d.device_id?.toLowerCase().includes(query)
        );
    }

    renderDevices(filtered);
}

/**
 * Render devices in table
 */
function renderDevices(devices) {
    if (devices.length === 0) {
        renderEmptyState();
        return;
    }

    emptyState.style.display = 'none';

    let html = '';
    devices.forEach((device, index) => {
        const isRevoked = device.is_revoked;
        const statusBadge = isRevoked
            ? '<span class="badge badge-revoked">REVOKED</span>'
            : '<span class="badge badge-active">ACTIVE</span>';

        const createdDate = formatDate(device.created_at);
        const lastActiveDate = formatDate(device.last_active);

        html += `
            <tr>
                <td><strong>${escapeHtml(device.device_name || 'Unknown')}</strong></td>
                <td><code>${escapeHtml(device.device_id?.substring(0, 12) || '')}...</code></td>
                <td>${escapeHtml(device.user_id?.substring(0, 8) || '')}...</td>
                <td>${createdDate}</td>
                <td>${lastActiveDate}</td>
                <td>${statusBadge}</td>
                <td>
                    <button class="btn btn-sm btn-primary" data-view="${index}">View</button>
                    ${!isRevoked ? `<button class="btn btn-sm btn-danger" data-revoke="${index}">Revoke</button>` : ''}
                </td>
            </tr>
        `;
    });

    devicesTableBody.innerHTML = html;
    for (const button of devicesTableBody.querySelectorAll('[data-view]')) {
        button.addEventListener('click', () => showDeviceDetail(devices[Number(button.dataset.view)].id));
    }
    for (const button of devicesTableBody.querySelectorAll('[data-revoke]')) {
        const device = devices[Number(button.dataset.revoke)];
        button.addEventListener('click', () => openRevokeModal(device.id, device.device_name || 'Unknown'));
    }
}

/**
 * Show device detail modal
 */
async function showDeviceDetail(deviceId) {
    try {
        const device = allDevices.find(d => d.id === deviceId);
        if (!device) return;

        const html = `
            <div style="padding: 0;">
                <h4 style="margin-bottom: 1rem;">Device Information</h4>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2rem;">
                    <div>
                        <label style="font-weight: 500; color: #6b7280; font-size: 0.875rem;">Device Name</label>
                        <p style="margin: 0.5rem 0 1rem 0; font-size: 1.125rem;">${escapeHtml(device.device_name || 'Unknown')}</p>
                    </div>
                    <div>
                        <label style="font-weight: 500; color: #6b7280; font-size: 0.875rem;">Status</label>
                        <p style="margin: 0.5rem 0 1rem 0;">
                            ${device.is_revoked 
                                ? '<span class="badge badge-revoked">REVOKED</span>' 
                                : '<span class="badge badge-active">ACTIVE</span>'}
                        </p>
                    </div>
                    <div>
                        <label style="font-weight: 500; color: #6b7280; font-size: 0.875rem;">Device ID</label>
                        <p style="margin: 0.5rem 0 1rem 0; font-family: monospace; font-size: 0.875rem; word-break: break-all;">${escapeHtml(device.device_id || '')}</p>
                    </div>
                    <div>
                        <label style="font-weight: 500; color: #6b7280; font-size: 0.875rem;">User ID</label>
                        <p style="margin: 0.5rem 0 1rem 0; font-family: monospace; font-size: 0.875rem;">${escapeHtml(device.user_id || '')}</p>
                    </div>
                    <div>
                        <label style="font-weight: 500; color: #6b7280; font-size: 0.875rem;">Registered</label>
                        <p style="margin: 0.5rem 0 1rem 0;">${formatDate(device.created_at)}</p>
                    </div>
                    <div>
                        <label style="font-weight: 500; color: #6b7280; font-size: 0.875rem;">Last Active</label>
                        <p style="margin: 0.5rem 0 1rem 0;">${formatDate(device.last_active)}</p>
                    </div>
                </div>

                ${device.is_revoked ? `
                    <div style="background: #fef2f2; padding: 1rem; border-radius: 0.5rem; margin-top: 1.5rem;">
                        <label style="font-weight: 500; color: #6b7280; font-size: 0.875rem;">Revocation Details</label>
                        <p style="margin: 0.5rem 0; color: #dc2626;">
                            Revoked at: ${device.revoked_at ? formatDate(device.revoked_at) : 'N/A'}
                        </p>
                        <p style="margin: 0.5rem 0; color: #6b7280; font-size: 0.875rem;">
                            Revoked by: ${device.revoked_by ? escapeHtml(device.revoked_by.substring(0, 8)) + '...' : 'System'}
                        </p>
                    </div>
                ` : ''}
            </div>
        `;

        document.getElementById('deviceDetailContent').innerHTML = html;
        detailModal.style.display = 'flex';
    } catch (error) {
        showError(`Failed to load device details: ${error.message}`);
    }
}

/**
 * Open revoke confirmation modal
 */
function openRevokeModal(deviceId, deviceName) {
    selectedDeviceId = deviceId;
    document.getElementById('revokeDeviceName').textContent = deviceName;
    document.getElementById('revocationReason').value = '';
    revokeModal.style.display = 'flex';
}

/**
 * Close revoke modal
 */
function closeRevokeModal() {
    revokeModal.style.display = 'none';
    selectedDeviceId = null;
}

/**
 * Confirm device revocation
 */
document.getElementById('confirmRevokeBtn').addEventListener('click', async () => {
    if (!selectedDeviceId) return;

    try {
        const reason = document.getElementById('revocationReason').value || 'Admin revocation';
        
        const { error } = await supabase.functions.invoke('admin/devices/' + encodeURIComponent(selectedDeviceId), {
            method: 'DELETE',
            body: { reason },
        });

        if (error) throw error;

        showSuccess('Device revoked successfully');
        closeRevokeModal();
        loadDevices();
    } catch (error) {
        showError(`Failed to revoke device: ${error.message}`);
    }
});

/**
 * Close detail modal
 */
function closeDetailModal() {
    detailModal.style.display = 'none';
}

// ============================================
// Event Listeners
// ============================================

/**
 * Refresh button
 */
refreshBtn.addEventListener('click', loadDevices);

/**
 * Search and filter
 */
searchInput.addEventListener('input', filterDevices);
filterStatus.addEventListener('change', filterDevices);

/**
 * Close modals on background click
 */
revokeModal.addEventListener('click', (e) => {
    if (e.target === revokeModal) closeRevokeModal();
});

detailModal.addEventListener('click', (e) => {
    if (e.target === detailModal) closeDetailModal();
});

// ============================================
// UI Helpers
// ============================================

/**
 * Show login panel
 */
function showLoginPanel() {
    loginPanel.style.display = 'block';
    mainContent.style.display = 'none';
    logoutBtn.style.display = 'none';
}

/**
 * Show main content
 */
function showMainContent() {
    loginPanel.style.display = 'none';
    mainContent.style.display = 'block';
    logoutBtn.style.display = 'block';
}

/**
 * Show empty state
 */
function renderEmptyState() {
    devicesTableBody.innerHTML = '';
    emptyState.style.display = 'block';
}

/**
 * Show loading state
 */
function showLoading(context) {
    loadingState.style.display = 'flex';
}

/**
 * Hide loading state
 */
function hideLoading(context) {
    loadingState.style.display = 'none';
}

/**
 * Show error alert
 */
function showError(message) {
    errorAlert.textContent = message;
    errorAlert.style.display = 'block';
    setTimeout(() => {
        errorAlert.style.display = 'none';
    }, 5000);
}

/**
 * Show success alert
 */
function showSuccess(message) {
    successAlert.textContent = message;
    successAlert.style.display = 'block';
    setTimeout(() => {
        successAlert.style.display = 'none';
    }, 3000);
}

/**
 * Update statistics
 */
function updateStats() {
    const total = allDevices.length;
    const active = allDevices.filter(d => !d.is_revoked).length;
    const revoked = allDevices.filter(d => d.is_revoked).length;

    document.getElementById('totalDevices').textContent = total;
    document.getElementById('activeDevices').textContent = active;
    document.getElementById('revokedDevices').textContent = revoked;
}

/**
 * Format date for display
 */
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// Check Authentication Status
// ============================================

/**
 * Initialize app - check if user is already logged in
 */
async function initializeApp() {
    try {
        const { user, state } = await checkAdminSession();
        if (state === 'mfa') return location.replace(signInUrl('devices'));
        if (state === 'ready') {
            currentUser = user;
            showMainContent();
            await loadDevices();
        } else {
            showLoginPanel();
            if (state === 'forbidden') document.getElementById('loginError').textContent = 'Administrator access required.';
            document.getElementById('loginError').style.display = state === 'forbidden' ? 'block' : 'none';
        }
    } catch (error) {
        console.error('Initialization error:', error);
        showLoginPanel();
    }
}

// Start app on load
document.addEventListener('DOMContentLoaded', initializeApp);
