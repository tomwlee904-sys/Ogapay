import Layout from '../components/Layout'

export default function Tasks() {
  return (
    <Layout>
      <div className="sec">
        <div className="hero">
          <div className="greeting">Available Work</div>
          <h1>Tasks</h1>
        </div>
        <div className="search-bar">
          <i className="ti ti-search" />
          <input type="text" placeholder="Search tasks..." />
        </div>
      </div>

      <div className="gig-list">
        {tasks.map((task, i) => (
          <div className="gig-item" key={i}>
            <div className="gig-info">
              <div className="gi-title">{task.title}</div>
              <div className="gi-meta">
                <span><i className="ti ti-coin" /> &#8358;{task.reward}</span>
                <span><i className="ti ti-clock" /> ~{task.time} min</span>
                <span><i className="ti ti-users" /> {task.slots} slots</span>
              </div>
            </div>
            <a className="gig-apply" href={`/app/tasks/${task.id}`}>View</a>
          </div>
        ))}
      </div>
    </Layout>
  )
}

const tasks = [
  { id: 1, title: 'Social Media Engagement - Like & Comment', reward: '500', time: 10, slots: 50 },
  { id: 2, title: 'App Testing - UI/UX Feedback', reward: '1,200', time: 25, slots: 20 },
  { id: 3, title: 'Content Review - Article Proofread', reward: '800', time: 15, slots: 30 },
  { id: 4, title: 'Video Reaction - Product Review', reward: '2,000', time: 30, slots: 10 },
  { id: 5, title: 'Community Engagement - Discord/TG', reward: '350', time: 5, slots: 100 },
  { id: 6, title: 'Data Entry - Product Listing', reward: '1,500', time: 45, slots: 15 },
]
