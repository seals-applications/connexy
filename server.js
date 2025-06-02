const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Sequelize, DataTypes } = require('sequelize');

// 環境変数の設定
const env = process.env.NODE_ENV || 'development';
const config = require('./config/config.json')[env];

// Sequelize インスタンスの初期化
const sequelize = new Sequelize(config.database, config.username, config.password, config);

// モデルのインポート
const db = require('./models');
const { User, Project, Employee, Application } = db; // Userがundefinedになっていないか確認
console.log('User model:', User); // Userモデルをログに出力

const app = express();

// EJSをテンプレートエンジンとして設定
app.set('view engine', 'ejs');
app.set('views', './views'); // EJSファイルを保存するディレクトリを指定

// JSONデータを解析
app.use(bodyParser.json());

// フォームデータを解析
app.use(express.urlencoded({ extended: true }));

// cookie-parser をミドルウェアとして使用
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

const JWT_SECRET = 'your_secret_key';

// モデルの関連付け
if (User) {
    User.hasMany(Project, { foreignKey: 'userId' });
    Project.belongsTo(User, { foreignKey: 'userId' });
    User.hasMany(Employee, { foreignKey: 'userId' });
    Employee.belongsTo(User, { foreignKey: 'userId' });
    User.hasMany(Application, { foreignKey: 'applicantUserId' });
    Application.belongsTo(User, { foreignKey: 'applicantUserId' });
    Project.hasMany(Application, { foreignKey: 'projectId' });
    Application.belongsTo(Project, { foreignKey: 'projectId' });
    Employee.hasMany(Application, { foreignKey: 'employeeId' });
    Application.belongsTo(Employee, { foreignKey: 'employeeId' });
} else {
    console.error('User model is undefined');
}

// ルートの設定
app.get('/', (req, res) => {
    res.send('Project Management API is running!');
});

// ユーザー登録
app.post('/register', async (req, res) => {
    try {
        console.log('Received registration data:', req.body); // リクエストボディをログに出力

        const { username, password, companyName, representativeName, phoneNumber } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        // パスワードをハッシュ化
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('Hashed password:', hashedPassword); // ハッシュ化されたパスワードをログに出力

        const newUser = await User.create({
            username,
            password: hashedPassword,
            companyName,
            representativeName,
            phoneNumber
        });

        res.status(201).json({ message: 'User registered successfully', user: newUser });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed', details: error.message });
    }
});


const project = sequelize.define('project', {
    action: DataTypes.STRING,
    timestamp: DataTypes.DATE
});

// JWTトークンを使用した認証ミドルウェア
const authenticate = (req, res, next) => {
    const token = req.cookies.token; // クッキーからトークンを取得

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // デコードされたユーザー情報をreq.userに追加
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// ログインページを提供するルート
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});


// ログイン処理
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // ユーザー名とパスワードが提供されているか確認
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const user = await User.findOne({ where: { username } });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ error: 'Invalid username or password' });
        }

        // トークンをクッキーに保存
        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
        res.cookie('token', token, { httpOnly: true });

        res.json({ message: 'Login successful' });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});


// 出退勤画面のルート
app.get('/project', authenticate, (req, res) => {
    const username = req.user.username; // 認証されたユーザーの名前を取得
    res.render('project', { username });
});

// 案件登録ページを提供するルート
app.get('/project-registration', authenticate, (req, res) => {
    res.render('projectRegistration');
});

// 案件を取得するエンドポイントをここに追加
app.get('/api/projects', authenticate, async (req, res) => {
    try {
        console.log('Fetching projects for user ID:', req.user.id); // ユーザーIDをログに出力
        const projects = await Project.findAll({});
        console.log('Fetched projects:', projects); // 取得したプロジェクトをログに表示
        res.json(projects);
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ error: 'Failed to fetch projects', details: error.message });
    }
});

// 案件を登録するエンドポイントをここに追加
app.post('/api/projects', authenticate, async (req, res) => {
    try {
        console.log('Received data:', req.body); // 受け取ったデータをログに出力

        const { projectName, prefecture, city, workingDate, startTime, endTime, projectDescription, projectDetail, skills, reward, deadline, projectGenre } = req.body;

        // 必要なフィールドがすべて存在するか確認
        if (!projectName || !prefecture || !city || !workingDate || !startTime || !endTime || !projectDescription || !projectDetail || !skills || !reward || !deadline || !projectGenre) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const userId = req.user.id; // authenticateミドルウェアでユーザー情報を取得していると仮定

        // プロジェクトをデータベースに保存する処理
        const newProject = await Project.create({
            projectName,
            prefecture,
            city,
            workingDate,
            startTime,
            endTime,
            projectDescription,
            projectDetail,
            skills,
            reward,
            deadline,
            projectGenre,
            userId
        });

        res.status(201).json(newProject);
    } catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json({ error: 'プロジェクトの登録に失敗しました。' });
    }
});


// 案件詳細ページを提供するルート
app.get('/project-detail/:id', authenticate, (req, res) => {
    res.render('projectDetail');
});

// 案件の詳細を取得するエンドポイント
app.get('/api/projects/:id', authenticate, async (req, res) => {
    try {
        const projectId = req.params.id;

        if (!projectId) {
            return res.status(400).json({ error: 'Project ID is required' });
        }

        //console.log(project); // デバッグ用
        const project = await Project.findOne({
            where: { id: projectId },
            include: [{
                model: User,
                attributes: ['companyName', 'representativeName', 'phoneNumber']
            }]
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        res.json({
            projectName: project.projectName,
            prefecture: project.prefecture,
            city: project.city,
            workingDate: project.workingDate,
            startTime: project.startTime,
            endTime: project.endTime,
            projectDescription: project.projectDescription,
            projectDetail: project.projectDetail,
            skills: project.skills,
            reward: project.reward,
            deadline: project.deadline,
            projectGenre: project.projectGenre,
            companyName: project.User.companyName,
            representativeName: project.User.representativeName,
            phoneNumber: project.User.phoneNumber
        });
    } catch (error) {
        console.error('Error fetching project details:', error); // エラーを詳細にログに出力
        res.status(500).json({ error: 'Failed to fetch project details', details: error.message });
    }
});

// 削除リクエストを処理するエンドポイント
app.delete('/api/projects/:id/delete', authenticate, async (req, res) => {
    const projectId = req.params.id;

    try {
        const project = await Project.findByPk(projectId);

        if (!project) {
            return res.status(404).json({ message: 'プロジェクトが見つかりません' });
        }

        await project.destroy();
        res.json({ message: 'プロジェクトが削除されました' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'エラーが発生しました' });
    }
});

// データベース同期とサーバー起動
sequelize.sync({ force: false }).then(() => {
    console.log('データベースに接続し、モデルを同期しました。');

// 従業員登録エンドポイント
app.use('/api/employees', require('./models/employees')); // ルーターを使用

    // サーバーの起動
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log('Server is running on port ${PORT}');
    });
}).catch(error => {
    console.error('データベース接続エラー:', error);
});

// 新規登録ページを提供するルート
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

// ユーザー名の重複をチェックするエンドポイントを追加
app.get('/check-username', async (req, res) => {
    try {
        const { username } = req.query;
        const existingUser = await User.findOne({ where: { username } });
        if (existingUser) {
            return res.json({ exists: true });
        }
        res.json({ exists: false });
    } catch (error) {
        console.error('Error checking username:', error);
        res.status(500).json({ error: 'Error checking username' });
    }
});

// 登録成功ページを提供するルート
app.get('/register-success', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'registerSuccess.html'));
});

// マイページへのルート設定
app.get('/mypage', authenticate, (req, res) => {
    const userId = req.user.id;
    User.findByPk(userId)
        .then(user => {
            if (user) {
                res.render('mypage', { user });
            } else {
                res.status(404).send('User not found');
            }
        })
        .catch(error => {
            console.error('Error fetching user:', error);
            res.status(500).send('Internal Server Error');
        });
});

// プロフィール更新のルート設定
app.post('/update-profile', authenticate, (req, res) => {
    const userId = req.user.id;
    const { companyName, representativeName, phoneNumber } = req.body;

    User.update(
        { companyName, representativeName, phoneNumber },
        { where: { id: userId } }
    )
    .then(() => res.json({ message: 'Profile updated successfully' }))
    .catch(error => {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    });
});

// プロフィール編集ページを提供するルート
app.get('/edit-profile', authenticate, (req, res) => {
    const userId = req.user.id;
    User.findByPk(userId)
        .then(user => {
            if (user) {
                res.render('editProfile', { user });
            } else {
                res.status(404).send('User not found');
            }
        })
        .catch(error => {
            console.error('Error fetching user:', error);
            res.status(500).send('Internal Server Error');
        });
});

// 案件状況ページを提供するルート
app.get('/project-status', authenticate, (req, res) => {
    const userId = req.user.id;
    User.findByPk(userId)
        .then(user => {
            if (user) {
                res.render('projectStatus', { user });
            } else {
                res.status(404).send('User not found');
            }
        })
        .catch(error => {
            console.error('Error fetching user:', error);
            res.status(500).send('Internal Server Error');
        });
});

// プロフィール編集ページを提供するルート
app.get('/employee-registration', authenticate, (req, res) => {
    console.log('Accessing employee registration page');
    const userId = req.user.id;
    User.findByPk(userId)
        .then(user => {
            if (user) {
                console.log('User found, rendering employeeRegistration');
                res.render('employeeRegistration', { user });
            } else {
                console.log('User not found');
                res.status(404).send('User not found');
            }
        })
        .catch(error => {
            console.error('Error fetching user:', error);
            res.status(500).send('Internal Server Error');
        });
});

// 従業員一覧を取得するAPIエンドポイント
app.get('/api/employees', authenticate, async (req, res) => {
    try {
        const employees = await Employee.findAll({ where: { userId: req.user.id } });
        res.json(employees);
    } catch (error) {
        console.error('従業員一覧取得エラー:', error);
        res.status(500).json({ error: '従業員一覧の取得に失敗しました' });
    }
});

// 従業員一覧ページを提供するルート
app.get('/employee-list', authenticate, (req, res) => {
    res.render('employeeList');
});

app.post('/api/employees/register', authenticate, async (req, res) => {
    try {
        console.log('Received employee registration data:', req.body); // リクエストボディをログに出力

        const { lastName, firstName, furigana, gender, birthdate, address, phoneNumber, nearestStation } = req.body;
        const employee = await Employee.create({
            lastName,
            firstName,
            furigana,
            gender,
            birthdate,
            address,
            phoneNumber,
            nearestStation,
            userId: req.user.id // ユーザーIDを関連付け
        });

        res.status(201).json({ message: '従業員が登録されました', employee });
    } catch (error) {
        console.error('従業員登録エラー:', error);
        res.status(500).json({ error: '従業員の登録に失敗しました', details: error.message });
    }
});

// 応募ページを提供するルート（変更後）
app.get('/project-application/:projectId', authenticate, (req, res) => {
    res.render('projectApplication');
});

// 応募を処理するAPIエンドポイント（変更後）
app.post('/api/project-application/:projectId', authenticate, async (req, res) => {
    try {
        const { projectId } = req.params;
        const { employeeId } = req.body;
        const userId = req.user.id;

        const project = await Project.findByPk(projectId);
        if (!project) {
            return res.status(404).json({ error: '案件が見つかりません' });
        }

        const application = await Application.create({
            projectId,
            applicantUserId: userId,
            employeeId,
        });

        res.status(201).json({ message: '応募が完了しました', application });
    } catch (error) {
        console.error('応募エラー:', error);
        res.status(500).json({ error: '応募に失敗しました' });
    }
});

// 案件募集状況ページを提供するルート
app.get('/project-application-status', authenticate, (req, res) => {
    res.render('projectApplicationStatus');
});

// 案応募状況を取得するAPIエンドポイント
app.get('/api/project-applications', authenticate, async (req, res) => {
    try {
        const projects = await Project.findAll({
            where: { userId: req.user.id },
            include: [{
                model: Application,
                include: [
                    { model: User, as: 'Applicant', attributes: ['companyName'] },
                    { model: Employee, attributes: ['name'] }
                ]
            }]
        });

        const formattedProjects = projects.map(project => ({
            id: project.id,
            projectName: project.projectName,
            applications: project.Applications.map(app => ({
                applicantCompanyName: app.Applicant.companyName,
                employeeName: app.Employee.name,
                appliedAt: app.appliedAt
            }))
        }));

        res.json(formattedProjects);
    } catch (error) {
        console.error('案件応募状況の取得エラー:', error);
        res.status(500).json({ error: '案件応募状況の取得に失敗しました' });
    }
});

const employeesRouter = require('./models/employees'); // ルーターをインポート

app.use(express.json()); // JSONボディをパースするミドルウェア
app.use('/api/employees', employeesRouter); // ルーターを使用

// 案件一覧を取得するエンドポイント
app.get('/projects', authenticate, async (req, res) => {
    try {
        const userId = req.user.id; // 認証ミドルウェアでユーザー情報を取得していると仮定
        const projects = await Project.findAll({ where: { userId } }); // ユーザーIDでフィルタリング
        res.render('projectsList', { projects }); // projectsList.ejsにデータを渡してレンダリング
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ error: 'Failed to fetch projects', details: error.message });
    }
});

// 案件を削除するエンドポイント
app.delete('/projects/:id', authenticate, async (req, res) => {
    const projectId = req.params.id;

    try {
        const project = await Project.findByPk(projectId);

        if (!project) {
            return res.status(404).json({ message: 'プロジェクトが見つかりません' });
        }

        await project.destroy();
        res.json({ message: 'プロジェクトが削除されました' });
    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({ message: 'エラーが発生しました' });
    }
});

app.get('/projects/edit/:id', async (req, res) => {
    const projectId = req.params.id;

    try {
        const project = await Project.findByPk(projectId); // プロジェクトをIDで取得

        if (!project) {
            return res.status(404).send('Project not found');
        }

        res.render('editProject', { project }); // プロジェクト情報をEJSに渡す
    } catch (error) {
        console.error('Error fetching project for edit:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.put('/api/projects/:id', async (req, res) => {
    const projectId = req.params.id;
    const { projectName, prefecture, city, workingDate, startTime, endTime, projectDescription, projectDetail, skills, reward, deadline, projectGenre } = req.body;

    try {
        const project = await Project.findByPk(projectId);

        if (!project) {
            return res.status(404).send('Project not found');
        }

        // プロジェクトの情報を更新
        project.projectName = projectName;
        project.prefecture = prefecture;
        project.city = city;
        project.workingDate = workingDate;
        project.startTime = startTime;
        project.endTime = endTime;
        project.projectDescription = projectDescription;
        project.projectDetail = projectDetail;
        project.skills = skills;
        project.reward = reward;
        project.deadline = deadline;
        project.projectGenre = projectGenre;

        await project.save(); // 更新を保存

        res.json({ message: 'Project updated successfully' });
    } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).send('Internal Server Error');
    }
});
