// @ts-nocheck
import { useState, useEffect, useRef, useCallback } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { apiRequest } from '../lib/api'

const API_BASE = 'https://ogapay-production.up.railway.app/api/v1'

const CATEGORIES = {
  'Web & App Build': ['Websites', 'Mobile Apps', 'Web Apps', 'Landing Pages', 'API Development', 'Other Web'],
  'Bots & Automations': ['Discord Bots', 'Telegram Bots', 'Trading Bots', 'Workflow Automation', 'Web Scraping', 'Other Bots'],
  'Blockchain & Crypto Dev': ['Smart Contracts', 'DApps', 'NFT Projects', 'DeFi', 'Solana Development', 'Other Crypto'],
  'Data & Dashboards': ['Data Analysis', 'Dashboards', 'Data Visualization', 'Data Entry', 'Other Data'],
  'AI & Machine Learning': ['Chatbots', 'Image Generation', 'Text Generation', 'Model Training', 'Other AI'],
  'Graphics & Design': ['Logo Design', 'Brand Identity', 'Social Media Graphics', 'UI/UX Design', 'Illustration', 'Other Design'],
  'Video & Animation': ['Video Editing', 'Motion Graphics', 'Animation', 'Explainer Videos', 'Other Video'],
  'Music & Audio': ['Audio Editing', 'Voice Over', 'Music Production', 'Sound Design', 'Other Audio'],
  'Writing & Translation': ['Content Writing', 'Copywriting', 'Translation', 'Proofreading', 'Technical Writing', 'Other Writing'],
  'Social & Growth Web3': ['Community Management', 'Growth Hacking', 'Twitter Marketing', 'Discord Growth', 'Other Social'],
  'Marketing & Ads': ['Social Media Marketing', 'Search Engine Marketing', 'Email Marketing', 'Influencer Marketing', 'Other Marketing'],
  'Community Raids & Engagement': ['Telegram Raids', 'Discord Raids', 'Twitter Raids', 'Engagement Campaigns', 'Other Raids'],
  'Product & Operations': ['Product Management', 'Operations', 'Project Management', 'QA Testing', 'Other Ops'],
  'Consulting & Advisory': ['Business Consulting', 'Tech Advisory', 'Strategy', 'Mentorship', 'Other Consulting'],
}

const DELIVERY_OPTIONS = ['1 day', '3 days', '7 days', '14 days', '30 days']

const STATUS_COLORS = {
  ACTIVE: '#16a34a',
  DRAFT: '#F59E0B',
  INACTIVE: '#DC2626',
}

function statusColor(s) {
  return STATUS_COLORS[s] || '#66738a'
}

function statusBg(s) {
  const c = statusColor(s)
  return c + '18'
}

export default function MyStore() {
  const { user, isAuthed } = useAuth()
  const getToken = () => localStorage.getItem('ogapay_access_token')

  // ── Tab state ──────────────────────────────────────────────────────────────
  const [tab, setTab] = useState('all')

  // ── Products state ─────────────────────────────────────────────────────────
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // ── Form state ─────────────────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formErrors, setFormErrors] = useState({})
  const [openMenuId, setOpenMenuId] = useState(null)
  const menuRef = useRef(null)

  // Form fields
  const [formName, setFormName] = useState('')
  const [formCategory, setFormCategory] = useState('')
  const [formSubcategory, setFormSubcategory] = useState('')
  const [formThumbnail, setFormThumbnail] = useState(null)
  const [formThumbnailPreview, setFormThumbnailPreview] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formPrice, setFormPrice] = useState(0.1)
  const [formRevisions, setFormRevisions] = useState(3)
  const [formDelivery, setFormDelivery] = useState('3 days')
  const [formAttachments, setFormAttachments] = useState([])
  const [formTags, setFormTags] = useState([])
  const [formTagInput, setFormTagInput] = useState('')
  const [generating, setGenerating] = useState(false)
  const [suggestingTags, setSuggestingTags] = useState(false)
  const [suggestingPrice, setSuggestingPrice] = useState(false)
  const [suggestingAll, setSuggestingAll] = useState(false)

  // ── Delete confirmation ────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // ── Toast ──────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState(null)
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ── Fetch products ─────────────────────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await apiRequest('/store/my-products')
      if (Array.isArray(data)) {
        setProducts(data)
      } else if (data?.products) {
        setProducts(data.products)
      } else {
        setProducts([])
      }
    } catch (err) {
      setError(err.message || 'Failed to load products')
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthed) fetchProducts()
    else setLoading(false)
  }, [isAuthed, fetchProducts])

  // ── Close menu on outside click ────────────────────────────────────────────
  useEffect(() => {
    if (!openMenuId) return
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [openMenuId])

  // ── Compute stats ──────────────────────────────────────────────────────────
  const stats = {
    products: products.length,
    sales: products.reduce((sum, p) => sum + (p.sales || 0), 0),
    orders: products.reduce((sum, p) => sum + (p.orders || p.orderCount || 0), 0),
  }

  // ── Filtered products ──────────────────────────────────────────────────────
  const filtered = tab === 'all'
    ? products
    : products.filter(p => (p.status || 'DRAFT').toUpperCase() === tab.toUpperCase())

  // ── Reset form ─────────────────────────────────────────────────────────────
  const resetForm = () => {
    setEditingId(null)
    setFormName('')
    setFormCategory('')
    setFormSubcategory('')
    setFormThumbnail(null)
    setFormThumbnailPreview('')
    setFormDescription('')
    setFormPrice(0.1)
    setFormRevisions(3)
    setFormDelivery('3 days')
    setFormAttachments([])
    setFormTags([])
    setFormTagInput('')
    setFormErrors({})
  }

  // ── Open form for edit ─────────────────────────────────────────────────────
  const openEdit = (p) => {
    setEditingId(p.id)
    setFormName(p.name || '')
    setFormCategory(p.category || '')
    setFormSubcategory(p.subcategory || '')
    setFormDescription(p.description || '')
    setFormPrice(p.price || 0.1)
    setFormRevisions(p.revisions || 3)
    setFormDelivery(p.delivery || '3 days')
    setFormTags(p.tags || [])
    setFormThumbnailPreview(p.thumbnail || p.imageUrl || '')
    setFormThumbnail(null)
    setFormAttachments([])
    setFormErrors({})
    setShowForm(true)
    setOpenMenuId(null)
  }

  // ── Validate form ──────────────────────────────────────────────────────────
  const validateForm = () => {
    const errors = {}
    if (!formName.trim()) errors.name = 'Name is required'
    if (!formCategory) errors.category = 'Category is required'
    if (!formSubcategory) errors.subcategory = 'Subcategory is required'
    if (!formPrice || formPrice <= 0) errors.price = 'Price must be greater than 0'
    if (formTags.length === 0) errors.tags = 'Add at least one tag'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // ── Handle thumbnail file selection ────────────────────────────────────────
  const handleThumbnailChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFormThumbnail(file)
    const reader = new FileReader()
    reader.onload = () => setFormThumbnailPreview(reader.result)
    reader.readAsDataURL(file)
  }

  // ── Handle attachments selection ───────────────────────────────────────────
  const handleAttachmentsChange = (e) => {
    const files = Array.from(e.target.files || [])
    setFormAttachments(prev => {
      const combined = [...prev, ...files]
      return combined.slice(0, 5)
    })
  }

  const removeAttachment = (idx) => {
    setFormAttachments(prev => prev.filter((_, i) => i !== idx))
  }

  // ── Tags ───────────────────────────────────────────────────────────────────
  const addTag = () => {
    const tag = formTagInput.trim()
    if (!tag || formTags.includes(tag)) return
    setFormTags(prev => [...prev, tag])
    setFormTagInput('')
  }

  const removeTag = (tag) => {
    setFormTags(prev => prev.filter(t => t !== tag))
  }

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  // ── Smart defaults when category changes ───────────────────────────────────
  const onCategoryChange = (e) => {
    const cat = e.target.value
    setFormCategory(cat)
    setFormSubcategory('')
    const deliveryDefaults = {
      'Web & App Build': '14 days',
      'Bots & Automations': '7 days',
      'Blockchain & Crypto Dev': '14 days',
      'Data & Dashboards': '3 days',
      'AI & Machine Learning': '14 days',
      'Graphics & Design': '3 days',
      'Video & Animation': '7 days',
      'Music & Audio': '3 days',
      'Writing & Translation': '1 day',
      'Social & Growth Web3': '3 days',
      'Marketing & Ads': '7 days',
      'Community Raids & Engagement': '1 day',
      'Product & Operations': '7 days',
      'Consulting & Advisory': '7 days',
    }
    const revisionsDefaults = {
      'Web & App Build': 5,
      'Bots & Automations': 5,
      'Blockchain & Crypto Dev': 5,
      'Graphics & Design': 5,
      'Video & Animation': 4,
      'Writing & Translation': 3,
    }
    if (cat && deliveryDefaults[cat]) setFormDelivery(deliveryDefaults[cat])
    if (cat && revisionsDefaults[cat]) setFormRevisions(revisionsDefaults[cat])
  }

  // ── AI suggest tags ─────────────────────────────────────────────────────────
  const handleSuggestTags = async () => {
    if (!formName.trim()) {
      setFormErrors(prev => ({ ...prev, name: 'Enter a product name first' }))
      return
    }
    setSuggestingTags(true)
    try {
      const result = await apiRequest('/ai/suggest', {
        method: 'POST',
        body: JSON.stringify({ name: formName, category: formCategory }),
      })
      const tags = result?.tags || result?.data?.tags || []
      if (tags.length > 0) setFormTags(tags)
      showToast('Tags suggested!', 'success')
    } catch (err) {
      showToast(err.message || 'Tag suggestion failed', 'error')
    } finally {
      setSuggestingTags(false)
    }
  }

  // ── AI suggest price ────────────────────────────────────────────────────────
  const handleSuggestPrice = async () => {
    if (!formName.trim()) {
      setFormErrors(prev => ({ ...prev, name: 'Enter a product name first' }))
      return
    }
    setSuggestingPrice(true)
    try {
      const result = await apiRequest('/ai/suggest', {
        method: 'POST',
        body: JSON.stringify({ name: formName, category: formCategory }),
      })
      const price = result?.priceSuggestion || result?.data?.priceSuggestion
      if (price) setFormPrice(price)
      showToast('Price suggested!', 'success')
    } catch (err) {
      showToast(err.message || 'Price suggestion failed', 'error')
    } finally {
      setSuggestingPrice(false)
    }
  }

  // ── AI generate all (description + tags + price) ───────────────────────────
  const handleGenerateAll = async () => {
    if (!formName.trim()) {
      setFormErrors(prev => ({ ...prev, name: 'Enter a product name first' }))
      return
    }
    setSuggestingAll(true)
    try {
      const [descResult, suggestResult] = await Promise.all([
        apiRequest('/ai/generate-description', {
          method: 'POST',
          body: JSON.stringify({ name: formName, category: formCategory }),
        }),
        apiRequest('/ai/suggest', {
          method: 'POST',
          body: JSON.stringify({ name: formName, category: formCategory }),
        }),
      ])
      const desc = descResult?.description || descResult?.text || descResult?.data?.description || ''
      if (desc) setFormDescription(desc)
      const tags = suggestResult?.tags || suggestResult?.data?.tags || []
      if (tags.length > 0) setFormTags(tags)
      const price = suggestResult?.priceSuggestion || suggestResult?.data?.priceSuggestion
      if (price) setFormPrice(price)
      showToast('Product details generated!', 'success')
    } catch (err) {
      showToast(err.message || 'AI generation failed', 'error')
    } finally {
      setSuggestingAll(false)
    }
  }

  // ── AI generate description ────────────────────────────────────────────────
  const handleGenerateAI = async () => {
    if (!formName.trim()) {
      setFormErrors(prev => ({ ...prev, name: 'Enter a product name first' }))
      return
    }
    setGenerating(true)
    try {
      const result = await apiRequest('/ai/generate-description', {
        method: 'POST',
        body: JSON.stringify({ name: formName, category: formCategory }),
      })
      const desc = result?.description || result?.text || result?.data?.description || ''
      if (desc) setFormDescription(desc)
      showToast('Description generated!', 'success')
    } catch (err) {
      showToast(err.message || 'AI generation failed', 'error')
    } finally {
      setGenerating(false)
    }
  }

  // ── Save product ───────────────────────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault()
    if (!validateForm()) return
    setSaving(true)

    const fd = new FormData()
    fd.append('name', formName.trim())
    fd.append('category', formCategory)
    fd.append('subcategory', formSubcategory)
    fd.append('description', formDescription)
    fd.append('price', String(formPrice))
    fd.append('revisions', String(formRevisions))
    fd.append('delivery', formDelivery)
    fd.append('status', 'ACTIVE')
    if (formThumbnail) fd.append('thumbnail', formThumbnail)
    formAttachments.forEach(f => fd.append('attachments', f))
    formTags.forEach(t => fd.append('tags', t))

    try {
      const token = getToken()
      const url = API_BASE + (editingId ? `/store/products/${editingId}` : '/store/products')
      const method = editingId ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: token ? { Authorization: 'Bearer ' + token } : {},
        body: fd,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || err.error || 'Failed to save product')
      }

      showToast(editingId ? 'Product updated!' : 'Product created!', 'success')
      setShowForm(false)
      resetForm()
      fetchProducts()
    } catch (err) {
      showToast(err.message || 'Failed to save product', 'error')
    } finally {
      setSaving(false)
    }
  }

  // ── Toggle product status ──────────────────────────────────────────────────
  const toggleStatus = async (p) => {
    const nextStatus = p.status === 'ACTIVE' ? 'DRAFT' : 'ACTIVE'
    try {
      await apiRequest('/store/products/' + p.id, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      })
      showToast(`Product ${nextStatus === 'ACTIVE' ? 'activated' : 'drafted'}!`, 'success')
      fetchProducts()
    } catch (err) {
      showToast(err.message || 'Failed to update status', 'error')
    }
    setOpenMenuId(null)
  }

  // ── Delete product ─────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await apiRequest('/store/products/' + deleteTarget.id, {
        method: 'DELETE',
      })
      showToast('Product deleted!', 'success')
      setDeleteTarget(null)
      fetchProducts()
    } catch (err) {
      showToast(err.message || 'Failed to delete product', 'error')
    } finally {
      setDeleting(false)
    }
  }

  // ── Format price display ───────────────────────────────────────────────────
  const fmtPrice = (p) => {
    if (p.currency === 'NGN') return '₦' + Number(p.price || p.price || 0).toLocaleString()
    return Number(p.price || 0).toFixed(2) + ' SOL'
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Layout>
      <style>{`
        .mst-hero{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:10px}
        .mst-hero-left h1{font-family:Outfit;font-size:28px;font-weight:900;margin:0 0 4px}
        .mst-hero-left p{color:var(--text2);font-size:14px;margin:0}
        .mst-add-btn{height:38px;padding:0 16px;border-radius:10px;border:0;background:var(--accent);color:#fff;font-weight:700;font-size:12px;display:inline-flex;align-items:center;gap:6px;cursor:pointer;transition:all .2s;text-decoration:none;font-family:inherit}
        .mst-add-btn:hover{box-shadow:0 4px 16px rgba(31,140,255,.2)}
        .mst-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px}
        @media(max-width:500px){.mst-stats{grid-template-columns:1fr}}
        .mst-stat{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px;text-align:center;transition:all .25s}
        .mst-stat:hover{transform:translateY(-2px);border-color:var(--accent)}
        .mst-stat i{font-size:24px;margin-bottom:6px;display:block}
        .mst-stat .mst-num{font-family:Outfit;font-size:24px;font-weight:900}
        .mst-stat .mst-label{font-size:12px;color:var(--text2);margin-top:2px}
        .mst-tabs{display:flex;gap:4px;margin-bottom:14px}
        .mst-tab{padding:6px 14px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--text2);font-size:11px;font-weight:600;cursor:pointer;transition:all .2s;font-family:inherit}
        .mst-tab:hover,.mst-tab.active{border-color:var(--accent);color:var(--accent);background:rgba(31,140,255,.08)}
        .mst-list{display:grid;gap:6px}
        .mst-item{display:flex;align-items:center;gap:14px;padding:14px 16px;background:var(--card);border:1px solid var(--border);border-radius:12px;transition:all .2s;position:relative}
        .mst-item:hover{border-color:var(--border2)}
        .mst-thumb{width:40px;height:40px;border-radius:8px;object-fit:cover;flex-shrink:0;background:var(--bg2);display:grid;place-items:center;font-size:18px;color:var(--text3)}
        .mst-icon{width:36px;height:36px;border-radius:9px;display:grid;place-items:center;flex-shrink:0;font-size:16px}
        .mst-info{flex:1;min-width:0}
        .mst-name{font-weight:700;font-size:13px;margin-bottom:2px}
        .mst-meta{font-size:11px;color:var(--text3);display:flex;gap:10px;align-items:center}
        .mst-right{text-align:right;flex-shrink:0;display:flex;align-items:center;gap:8px}
        .mst-price{font-weight:700;font-size:14px}
        .mst-status{padding:3px 8px;border-radius:5px;font-size:10px;font-weight:700;display:inline-block;margin-top:4px}
        .mst-empty{text-align:center;padding:48px 20px;color:var(--text2)}
        .mst-empty i{font-size:36px;color:var(--text3);margin-bottom:12px;display:block}

        /* ── Menu ── */
        .mst-menu-btn{background:none;border:none;color:var(--text3);cursor:pointer;padding:4px 8px;border-radius:6px;font-size:18px;line-height:1;font-family:inherit}
        .mst-menu-btn:hover{background:var(--bg2);color:var(--text)}
        .mst-menu-dropdown{position:absolute;right:0;top:100%;background:var(--card);border:1px solid var(--border);border-radius:10px;box-shadow:var(--shadow-md);z-index:50;min-width:160px;overflow:hidden}
        .mst-menu-item{display:flex;align-items:center;gap:8px;width:100%;padding:10px 14px;border:none;background:none;color:var(--text);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;text-align:left}
        .mst-menu-item:hover{background:var(--bg2)}
        .mst-menu-item.danger{color:var(--red)}

        /* ── Form ── */
        .mst-form{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:24px;margin-bottom:20px}
        .mst-form h2{font-family:Outfit;font-size:18px;font-weight:900;margin:0 0 16px}
        .mst-form-row{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px}
        @media(max-width:500px){.mst-form-row{grid-template-columns:1fr}}
        .mst-field{margin-bottom:14px}
        .mst-field label{display:block;font-size:11px;font-weight:700;color:var(--text3);margin-bottom:4px;text-transform:uppercase;letter-spacing:.04em}
        .mst-field input,.mst-field textarea,.mst-field select{width:100%;padding:0 12px;height:38px;border:1px solid var(--border);border-radius:8px;background:var(--bg2);color:var(--text);font-size:13px;outline:none;transition:border-color .2s;box-sizing:border-box;font-family:inherit}
        .mst-field textarea{height:100px;padding:10px 12px;resize:vertical}
        .mst-field input:focus,.mst-field textarea:focus,.mst-field select:focus{border-color:var(--accent)}
        .mst-field input.error,.mst-field select.error{border-color:var(--red)}
        .mst-field .field-error{color:var(--red);font-size:11px;margin-top:4px;font-weight:600}

        /* ── Thumbnail preview ── */
        .mst-thumb-area{width:120px;height:120px;border:2px dashed var(--border);border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;background:var(--bg2);overflow:hidden;position:relative}
        .mst-thumb-area:hover{border-color:var(--accent)}
        .mst-thumb-area img{width:100%;height:100%;object-fit:cover;position:absolute;inset:0}
        .mst-thumb-area span{font-size:11px;color:var(--text3);text-align:center;padding:4px}

        /* ── Tags ── */
        .mst-tags{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px}
        .mst-tag{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:6px;background:rgba(31,140,255,0.1);color:var(--accent);font-size:11px;font-weight:700}
        .mst-tag-remove{background:none;border:none;color:inherit;cursor:pointer;padding:0;font-size:14px;line-height:1;opacity:0.6}
        .mst-tag-remove:hover{opacity:1}

        /* ── Attachments ── */
        .mst-attachments{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
        .mst-attachment{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:6px;background:var(--bg2);border:1px solid var(--border);font-size:11px;font-weight:600}
        .mst-attachment button{background:none;border:none;color:var(--red);cursor:pointer;padding:0 0 0 4px;font-size:14px;line-height:1}

        /* ── Loading / Error ── */
        .mst-loading{display:flex;align-items:center;justify-content:center;padding:60px 20px;color:var(--text3);font-size:14px;gap:8px}
        .mst-error{text-align:center;padding:40px 20px;color:var(--red);font-size:14px}

        /* ── Buttons ── */
        .mst-btn-primary{height:38px;padding:0 16px;border-radius:10px;border:0;background:var(--accent);color:#fff;font-weight:700;font-size:12px;display:inline-flex;align-items:center;gap:6px;cursor:pointer;transition:all .2s;font-family:inherit}
        .mst-btn-primary:hover{box-shadow:0 4px 16px rgba(31,140,255,.2)}
        .mst-btn-primary:disabled{opacity:0.5;cursor:not-allowed}
        .mst-btn-secondary{height:38px;padding:0 16px;border-radius:10px;border:1px solid var(--border);background:transparent;color:var(--text2);font-weight:600;font-size:12px;display:inline-flex;align-items:center;gap:6px;cursor:pointer;transition:all .2s;font-family:inherit}
        .mst-btn-secondary:hover{border-color:var(--accent);color:var(--accent)}
        .mst-btn-ai{height:38px;padding:0 16px;border-radius:10px;border:0;background:linear-gradient(135deg,#7c3aed,#6366f1);color:#fff;font-weight:700;font-size:12px;display:inline-flex;align-items:center;gap:6px;cursor:pointer;transition:all .2s;font-family:inherit}
        .mst-tooltip{display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;border-radius:50%;background:var(--text3);color:#fff;font-size:9px;font-weight:800;cursor:help;margin-left:4px;vertical-align:middle;line-height:1;position:relative}
        .mst-tooltip:hover::after{content:attr(data-tip);position:absolute;bottom:calc(100% + 4px);left:50%;transform:translateX(-50%);background:#1a1d23;color:#fff;font-size:11px;font-weight:500;padding:6px 10px;border-radius:6px;white-space:nowrap;z-index:100;box-shadow:0 2px 8px rgba(0,0,0,0.15);pointer-events:none;max-width:240px;white-space:normal;text-transform:none;letter-spacing:normal}
        .mst-btn-ai-sm{height:28px;padding:0 10px;border-radius:8px;border:0;background:linear-gradient(135deg,#7c3aed,#6366f1);color:#fff;font-weight:700;font-size:11px;display:inline-flex;align-items:center;gap:4px;cursor:pointer;transition:all .2s;font-family:inherit}
        .mst-btn-ai-sm:hover{box-shadow:0 4px 16px rgba(124,58,237,.3)}
        .mst-btn-ai-sm:disabled{opacity:0.5;cursor:not-allowed}
        .mst-btn-ai:hover{box-shadow:0 4px 16px rgba(124,58,237,.3)}
        .mst-btn-ai:disabled{opacity:0.5;cursor:not-allowed}
        .mst-btn-danger{height:38px;padding:0 16px;border-radius:10px;border:1px solid var(--red);background:transparent;color:var(--red);font-weight:600;font-size:12px;display:inline-flex;align-items:center;gap:6px;cursor:pointer;transition:all .2s;font-family:inherit}
        .mst-btn-danger:hover{background:var(--red);color:#fff}
        .mst-form-actions{display:flex;gap:10px;margin-top:16px;flex-wrap:wrap}
        .mst-form-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
        .mst-form-top h2{margin:0}

        /* ── Toast ── */
        .mst-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(20px);padding:10px 20px;border-radius:10px;font-size:13px;font-weight:700;z-index:999;opacity:0;transition:all .3s;pointer-events:none;white-space:nowrap}
        .mst-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
        .mst-toast.success{background:var(--green);color:#fff}
        .mst-toast.error{background:var(--red);color:#fff}

        /* ── Delete modal ── */
        .mst-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000}
        .mst-modal{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:24px;max-width:400px;width:90%}
        .mst-modal h3{margin:0 0 8px;font-size:16px;font-weight:800}
        .mst-modal p{color:var(--text2);font-size:13px;margin:0 0 16px;line-height:1.5}
        .mst-modal-actions{display:flex;gap:10px;justify-content:flex-end}
      `}</style>

      {/* ── Toast ── */}
      {toast && (
        <div className={`mst-toast ${toast.type} show`}>
          {toast.msg}
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteTarget && (
        <div className="mst-modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="mst-modal" onClick={e => e.stopPropagation()}>
            <h3>Delete Product</h3>
            <p>Are you sure you want to delete "{deleteTarget.name}"? This cannot be undone.</p>
            <div className="mst-modal-actions">
              <button className="mst-btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="mst-btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mst-hero">
        <div className="mst-hero-left">
          <h1>My Store</h1>
          <p>Manage your products and services</p>
        </div>
        <button className="mst-add-btn" onClick={() => { resetForm(); setShowForm(true) }}>
          <i className="ti ti-plus" /> Add New Product
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="mst-stats">
        <div className="mst-stat">
          <i className="ti ti-building-store" style={{ color: '#1F8CFF' }} />
          <div className="mst-num" style={{ color: '#1F8CFF' }}>{stats.products}</div>
          <div className="mst-label">Products</div>
        </div>
        <div className="mst-stat">
          <i className="ti ti-coin" style={{ color: '#16a34a' }} />
          <div className="mst-num" style={{ color: '#16a34a' }}>{stats.sales}</div>
          <div className="mst-label">Sales</div>
        </div>
        <div className="mst-stat">
          <i className="ti ti-shopping-cart" style={{ color: '#2563EB' }} />
          <div className="mst-num" style={{ color: '#2563EB' }}>{stats.orders}</div>
          <div className="mst-label">Orders</div>
        </div>
      </div>

      {/* ── Add/Edit Product Form ── */}
      {showForm && (
        <form className="mst-form" onSubmit={handleSave}>
          <div className="mst-form-top">
            <h2>{editingId ? 'Edit Product' : 'Add New Product'}</h2>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button type="button" className="mst-btn-ai" onClick={handleGenerateAll} disabled={suggestingAll} style={{ height: 30, fontSize: 11, padding: '0 12px' }}>
                {suggestingAll ? <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> : <i className="ti ti-sparkles" />}
                Generate All with AI
              </button>
              <button type="button" className="mst-btn-secondary" onClick={() => { setShowForm(false); resetForm() }}>
                <i className="ti ti-x" /> Close Form
              </button>
            </div>
          </div>

          <div className="mst-form-row">
            <div className="mst-field">
              <label>Product Name *<span className="mst-tooltip" data-tip="Give your product a clear, descriptive title that buyers can easily search for">?</span></label>
              <input type="text" value={formName} onChange={e => setFormName(e.target.value)}
                className={formErrors.name ? 'error' : ''} placeholder="e.g. Social Media Growth Package" />
              {formErrors.name && <div className="field-error">{formErrors.name}</div>}
            </div>
            <div className="mst-field">
              <label>Price (SOL) *<span className="mst-tooltip" data-tip="Set a competitive price. Click sparkle to get an AI-suggested price based on your category">?</span></label>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="number" step="0.01" min="0" value={formPrice} onChange={e => setFormPrice(parseFloat(e.target.value) || 0)}
                  className={formErrors.price ? 'error' : ''} style={{ flex: 1 }} />
                <button type="button" className="mst-btn-ai-sm" onClick={handleSuggestPrice} disabled={suggestingPrice} title="Suggest price with AI">
                  {suggestingPrice ? <span className="spinner" style={{ width: 10, height: 10, borderWidth: 2 }} /> : <i className="ti ti-sparkles" />}
                  AI
                </button>
              </div>
              {formErrors.price && <div className="field-error">{formErrors.price}</div>}
            </div>
          </div>

          <div className="mst-form-row">
            <div className="mst-field">
              <label>Category *<span className="mst-tooltip" data-tip="Choose the category that best fits your product. Delivery time and revisions will auto-adjust">?</span></label>
              <select value={formCategory} onChange={onCategoryChange}
                className={formErrors.category ? 'error' : ''}>
                <option value="">Select a category</option>
                {Object.keys(CATEGORIES).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {formErrors.category && <div className="field-error">{formErrors.category}</div>}
            </div>
            <div className="mst-field">
              <label>Subcategory *<span className="mst-tooltip" data-tip="Narrow down your product type within the selected category">?</span></label>
              <select value={formSubcategory} onChange={e => setFormSubcategory(e.target.value)}
                className={formErrors.subcategory ? 'error' : ''}
                disabled={!formCategory}>
                <option value="">Select a subcategory</option>
                {(CATEGORIES[formCategory] || []).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {formErrors.subcategory && <div className="field-error">{formErrors.subcategory}</div>}
            </div>
          </div>

          <div className="mst-form-row">
            <div className="mst-field">
              <label>Revisions<span className="mst-tooltip" data-tip="Number of free revisions included. Auto-set based on category but you can change it">?</span></label>
              <input type="number" min="0" value={formRevisions} onChange={e => setFormRevisions(parseInt(e.target.value) || 0)} />
            </div>
            <div className="mst-field">
              <label>Expected Delivery *<span className="mst-tooltip" data-tip="How long buyers should expect to wait. Auto-adjusted per category">?</span></label>
              <select value={formDelivery} onChange={e => setFormDelivery(e.target.value)}>
                {DELIVERY_OPTIONS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mst-field">
            <label>Thumbnail<span className="mst-tooltip" data-tip="Upload an eye-catching image that represents your product. Recommended: 1200x800px">?</span></label>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
              <label className="mst-thumb-area">
                {formThumbnailPreview ? (
                  <img src={formThumbnailPreview} alt="Preview" />
                ) : (
                  <span><i className="ti ti-photo" style={{ fontSize: 24, display: 'block', marginBottom: 4 }} />No Image</span>
                )}
                <input type="file" accept="image/*" onChange={handleThumbnailChange} style={{ display: 'none' }} />
              </label>
              {formThumbnailPreview && (
                <button type="button" className="mst-btn-secondary" onClick={() => { setFormThumbnail(null); setFormThumbnailPreview('') }}>
                  <i className="ti ti-x" /> Remove
                </button>
              )}
            </div>
          </div>

          <div className="mst-field">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.04em', margin: 0 }}>
                Description<span className="mst-tooltip" data-tip="Describe what you offer, what buyers get, and why they should choose you">?</span>
              </label>
              <button type="button" className="mst-btn-ai" onClick={handleGenerateAI} disabled={generating} style={{ height: 28, fontSize: 11, padding: '0 10px' }}>
                {generating ? <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> : <i className="ti ti-sparkles" />}
                Generate with AI
              </button>
            </div>
            <textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Describe your product..." />
          </div>

          <div className="mst-field">
            <label>Tags *<span className="mst-tooltip" data-tip="Add keywords buyers might search for. Click sparkle for AI-suggested tags based on your product name and category">?</span></label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input type="text" value={formTagInput} onChange={e => setFormTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown} placeholder="Type a tag and press Enter" style={{ flex: 1 }} />
              <button type="button" className="mst-btn-secondary" onClick={addTag} style={{ flexShrink: 0 }}>Add</button>
              <button type="button" className="mst-btn-ai-sm" onClick={handleSuggestTags} disabled={suggestingTags} title="Suggest tags with AI">
                {suggestingTags ? <span className="spinner" style={{ width: 10, height: 10, borderWidth: 2 }} /> : <i className="ti ti-sparkles" />}
                Tags
              </button>
            </div>
            {formTags.length > 0 && (
              <div className="mst-tags" style={{ marginTop: 8 }}>
                {formTags.map(tag => (
                  <span key={tag} className="mst-tag">
                    {tag}
                    <button type="button" className="mst-tag-remove" onClick={() => removeTag(tag)}>&times;</button>
                  </span>
                ))}
              </div>
            )}
            {formErrors.tags && <div className="field-error">{formErrors.tags}</div>}
          </div>

          <div className="mst-field">
            <label>Attachments (up to 5 files)<span className="mst-tooltip" data-tip="Include sample files, portfolios, or delivery examples to build buyer trust">?</span></label>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <label className="mst-btn-secondary" style={{ cursor: 'pointer' }}>
                <i className="ti ti-upload" /> Choose Files
                <input type="file" multiple onChange={handleAttachmentsChange} style={{ display: 'none' }} />
              </label>
              {formAttachments.length > 0 && (
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>{formAttachments.length} file(s) selected</span>
              )}
            </div>
            {formAttachments.length > 0 && (
              <div className="mst-attachments">
                {formAttachments.map((f, i) => (
                  <span key={i} className="mst-attachment">
                    {f.name}
                    <button type="button" onClick={() => removeAttachment(i)}>&times;</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {formErrors.general && <div className="field-error" style={{ marginBottom: 10 }}>{formErrors.general}</div>}

          <div className="mst-form-actions">
            <button type="submit" className="mst-btn-primary" disabled={saving}>
              {saving ? (
                <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Saving...</>
              ) : (
                <><i className="ti ti-device-floppy" /> {editingId ? 'Update Product' : 'Save Product'}</>
              )}
            </button>
            <button type="button" className="mst-btn-secondary" onClick={() => { setShowForm(false); resetForm() }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* ── Tabs ── */}
      <div className="mst-tabs">
        {['all', 'active', 'draft'].map(t => (
          <button key={t} className={`mst-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="mst-loading">
          <span className="spinner" /> Loading products...
        </div>
      )}

      {/* ── Error ── */}
      {!loading && error && (
        <div className="mst-error">
          <i className="ti ti-alert-circle" style={{ fontSize: 24, display: 'block', marginBottom: 8 }} />
          {error}
          <button className="mst-btn-primary" onClick={fetchProducts} style={{ marginTop: 12, display: 'inline-flex' }}>
            <i className="ti ti-refresh" /> Retry
          </button>
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && !error && filtered.length === 0 && (
        <div className="mst-empty">
          <i className="ti ti-building-store" />
          <h3 style={{ fontFamily: 'Outfit', fontWeight: 800, margin: '0 0 4px', color: 'var(--text)' }}>No products yet</h3>
          <p style={{ fontSize: 13, margin: '0 0 16px' }}>Start adding products to your store</p>
          <button className="mst-add-btn" onClick={() => { resetForm(); setShowForm(true) }}>
            <i className="ti ti-plus" /> Add New Product
          </button>
        </div>
      )}

      {/* ── Product list ── */}
      {!loading && !error && filtered.length > 0 && (
        <div className="mst-list">
          {filtered.map(p => (
            <div className="mst-item" key={p.id} style={{ position: 'relative' }}>
              {p.thumbnail || p.imageUrl ? (
                <img src={p.thumbnail || p.imageUrl} alt="" className="mst-thumb" />
              ) : (
                <div className="mst-thumb">
                  <i className="ti ti-box" />
                </div>
              )}
              <div className="mst-info">
                <div className="mst-name">{p.name}</div>
                <div className="mst-meta">
                  <span>{p.sales || 0} sales</span>
                  {p.category && <span>· {p.category}</span>}
                </div>
              </div>
              <div className="mst-right">
                <div className="mst-price">{fmtPrice(p)}</div>
                <span className="mst-status" style={{ background: statusBg(p.status || 'DRAFT'), color: statusColor(p.status || 'DRAFT') }}>
                  {p.status || 'DRAFT'}
                </span>
                <div style={{ position: 'relative' }}>
                  <button className="mst-menu-btn" onClick={() => setOpenMenuId(openMenuId === p.id ? null : p.id)}>
                    ⋯
                  </button>
                  {openMenuId === p.id && (
                    <div className="mst-menu-dropdown" ref={menuRef}>
                      <button className="mst-menu-item" onClick={() => openEdit(p)}>
                        <i className="ti ti-edit" /> Edit
                      </button>
                      <button className="mst-menu-item" onClick={() => toggleStatus(p)}>
                        <i className={`ti ti-${p.status === 'ACTIVE' ? 'player-pause' : 'player-play'}`} />
                        {p.status === 'ACTIVE' ? 'Set Draft' : 'Set Active'}
                      </button>
                      <button className="mst-menu-item danger" onClick={() => { setDeleteTarget(p); setOpenMenuId(null) }}>
                        <i className="ti ti-trash" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}
