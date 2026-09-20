// editor controll - this is the management side, editors can see ALL articles
// no ownership check here, they're the boss basically
// status changes go thru specific endpoints (approve/return), not the general update

const Article = require('../models/Article');

// pulls every article in the system, count them up and sort by what the editor wants
async function dashboard(req, res, next) {
  try {
    const currentSort = req.query.sort || 'updated';
    const currentStatus = req.query.status || 'all';
    const currentGenre = req.query.genre || req.query.category || 'all';
    const currentSearch = (req.query.search || '').trim();

    // 1. Gather all publication counts & metrics across the whole site
    const [totalCount, statusAgg, viewsAgg, genreAgg] = await Promise.all([
      Article.countDocuments(),
      Article.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Article.aggregate([{ $group: { _id: null, totalClicks: { $sum: '$viewsCount' } } }]),
      Article.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { _id: 1 } }])
    ]);

    const statusCounts = {
      published: 0,
      pending: 0,
      returned: 0,
      draft: 0
    };
    statusAgg.forEach(item => {
      if (item._id && statusCounts[item._id] !== undefined) {
        statusCounts[item._id] = item.count;
      }
    });

    const stats = {
      total: totalCount,
      published: statusCounts.published,
      pending: statusCounts.pending,
      returned: statusCounts.returned,
      draft: statusCounts.draft,
      totalClicks: viewsAgg[0]?.totalClicks || 0,
      genres: genreAgg.filter(g => g._id).map(g => ({ name: g._id, count: g.count }))
    };

    // 2. Build filter query
    const filter = {};
    if (currentStatus && currentStatus !== 'all') {
      filter.status = currentStatus;
    }
    if (currentGenre && currentGenre !== 'all') {
      // support aliases (Tech/Technology, Entertainment/Culture)
      if (/^tech/i.test(currentGenre)) {
        filter.category = { $in: [/^tech/i, /^technology/i] };
      } else if (/^(entertainment|culture)/i.test(currentGenre)) {
        filter.category = { $in: [/^entertainment/i, /^culture/i] };
      } else if (/^sport/i.test(currentGenre)) {
        filter.category = { $in: [/^sport/i, /^sports/i] };
      } else {
        filter.category = new RegExp('^' + currentGenre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i');
      }
    }
    if (currentSearch) {
      filter.$or = [
        { title: new RegExp(currentSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
        { summary: new RegExp(currentSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }
      ];
    }

    // 3. Build sorting
    let sortQuery = { updatedAt: -1 };
    if (currentSort === 'views' || currentSort === 'clicks' || currentSort === 'popular') {
      sortQuery = { viewsCount: -1, updatedAt: -1 };
    } else if (currentSort === 'genre' || currentSort === 'category') {
      sortQuery = { category: 1, updatedAt: -1 };
    } else if (currentSort === 'status') {
      sortQuery = { status: 1, updatedAt: -1 };
    } else if (currentSort === 'oldest') {
      sortQuery = { updatedAt: 1 };
    }

    const articles = await Article.find(filter)
      .sort(sortQuery)
      .populate('author', 'displayName username')
      .lean();

    // If status sort was picked, order in editor workflow priority: pending -> returned -> draft -> published
    if (currentSort === 'status') {
      const order = { pending: 1, returned: 2, draft: 3, published: 4 };
      articles.sort((a, b) => (order[a.status] || 99) - (order[b.status] || 99));
    }

    res.render('editor/dashboard', {
      articles,
      stats,
      currentSort,
      currentStatus,
      currentGenre,
      currentSearch
    });
  } catch (err) {
    next(err);
  }
}

// shows one article for the editor to look at
// if the article was already published before, we show both versions side by side
async function review(req, res, next) {
  try {
    const article = await Article.findById(req.params.id).populate('author', 'displayName');
    if (!article) return res.status(404).send('Not found');
    res.render('editor/review', { article });
  } catch (err) {
    next(err);
  }
}

// editor can fix typos etc, but cant change status from here
async function update(req, res, next) {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).send('Not found');

    const editable = ['title', 'summary', 'body', 'category', 'image'];
    for (const field of editable) {
      if (req.body[field] !== undefined) article[field] = req.body[field];
    }

    // if the article is already live, an editor's edit goes straight to readers -
    // the editor is the authority, so no re-approval needed for their own change.
    // (drafts / pending / returned just save the content, status unchanged)
    if (article.status === 'published') {
      article.published = {
        title: article.title,
        summary: article.summary,
        body: article.body,
        category: article.category,
        image: article.image
      };
      article.updates = article.updates || [];
      article.updates.push(new Date()); // mark it on the analytics graph
    }

    await article.save();
    res.redirect(`/editor/articles/${article._id}`);
  } catch (err) {
    next(err);
  }
}

// approve and publish - copies the draft into the published subdoc
// also saves a timestamp so the analytics graph can mark when this update happened
async function approve(req, res, next) {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).send('Not found');

    if (article.status !== 'pending') return res.status(400).send('Only pending articles can be approved');

    // snapshot the current draft into published
    article.published = {
      title: article.title,
      summary: article.summary,
      body: article.body,
      category: article.category,
      image: article.image
    };

    article.status = 'published';
    article.publishedAt = new Date();
    article.editorNote = ''; // wipe old notes

    // push a timestamp for the analytics chart to show when this update went live
    article.updates = article.updates || [];
    article.updates.push(new Date());

    await article.save();
    res.redirect('/editor');
  } catch (err) {
    next(err);
  }
}

// sends it back to the reporter with a note explaining whats wrong
async function returnForFixes(req, res, next) {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).send('Not found');

    if (article.status !== 'pending') return res.status(400).send('Only pending articles can be returned');

    article.status = 'returned';
    article.editorNote = req.body.editorNote || 'Please review and fix.';
    await article.save();

    res.redirect('/editor');
  } catch (err) {
    next(err);
  }
}

// nukes the article completely
async function remove(req, res, next) {
  try {
    await Article.findByIdAndDelete(req.params.id);
    res.redirect('/editor');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  dashboard,
  review,
  update,
  approve,
  returnForFixes,
  remove,
};
