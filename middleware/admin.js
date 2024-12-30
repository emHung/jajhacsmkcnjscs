const admin = (req, res, next) => {
  console.log('=== Admin Check ===');
  console.log('User:', req.user);
  console.log('Role:', req.user?.user?.role);
  console.log('=================');

  if (req.user && req.user.user && req.user.user.role === 'admin') {
    next();
  } else {
    console.log('Access Denied - Not Admin');
    console.log('User structure:', JSON.stringify(req.user, null, 2));
    return res.status(403).json({
      status: 'error',
      message: 'Không có quyền truy cập. Chỉ admin mới có thể thực hiện thao tác này',
      currentRole: req.user?.user?.role || 'undefined'
    });
  }
};

module.exports = admin; 