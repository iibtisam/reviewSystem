var orm = require("orm"),
modts = require('orm-timestamps');

module.exports = {}


orm.connect("mysql://root:Conrad!1@127.0.0.1/review_system", function (err, db) {
  if (err) throw err;

     db.use(modts, {
        createdProperty: 'date_created',
        modifiedProperty: 'date_modified',
        expireProperty: false,
        dbtype: { type: 'date', time: true },
        now: function() { return new Date(); },
        expire: function() { var d = new Date(); return d.setMinutes(d.getMinutes() + 60); },
        persist: true
    });

    // ************************
    // **       Tenant       **
    // ************************
    var Tenant = db.define("tenants", {
        id: { type: 'number', required: true, unique: true },
        name: { type: 'text', size:100},
    },{
        timestamp: true,
        autoFetch: true
    });


    // ************************
    // **        Team        **
    // ************************
    var Team = db.define("teams", {
        id: { type: 'number', required: true, unique: true },
        name: { type: 'text', size:100},
    },{
        timestamp: true,
        autoFetch: true
    });
    Team.hasOne('tenant', Tenant);


    // ************************
    // **        User        **
    // ************************
    var User = db.define("users", {
        id: { type: 'number', required: true, unique: true },
        first_name: { type: 'text', size:30},
        last_name: { type: 'text', size:30},
        dob: { type: 'date', 'defaultValue':'2000-01-01', time: false},
        phone_number: { type: 'text'},
        email_address: { type: 'text', required: true },
        password: { type: 'text'}, 
        is_admin: {type: 'boolean', 'defaultValue':0},
        is_active: {type: 'boolean', 'defaultValue':1},
        user_id_ref: {type: 'number'}
    },{
        timestamp: true,
        autoFetch: true
    });
    User.hasOne('tenant', Tenant);
    User.hasOne('team', Team);



    // *************************
    // **     Review Goal     **
    // *************************
    var ReviewGoal = db.define("review_goals", {
        id: { type: 'number', required: true, unique: true },
        goal_year: { type: 'number'}
    },{
        autoFetch: true,
        timestamp: true
    });
    ReviewGoal.hasOne('user', User);


    // ************************
    // **        Goal        **
    // ************************
    var Goal = db.define("goals", {
        id: { type: 'number', required: true, unique: true },
        goal_text:{type:'text'},
        weightage:{type:'number'},
        goal_id: { type: 'number'},
        is_active: {type: 'boolean', 'defaultValue':1}
    },{
        autoFetch : true,
        autoFetchLimit: 2,
        timestamp: true
    });

    Goal.hasOne(
        'review_goal', 
        ReviewGoal//, 
        // {reverse: "review_goals"}
    );


    // ************************
    // **    Goal Tacking    **
    // ************************
    var GoalTracking = db.define("goals_tracking", {
        id: { type: 'number', required: true, unique: true },
        time_period: { type: 'date', 'defaultValue':'2000-01-01', time: false},
        progress:{type: 'number'},
        comments:{type: 'text'}
    },{
        timestamp: true,
        autoFetchLimit: 3, 
        autoFetch: true
    });

    GoalTracking.hasOne(
        'goal', 
        Goal//, 
        // {reverse: "goals"}
    );


    // *****************************************
    // **   Detailed Overall Progress Table   **
    // *****************************************
    var GoalUserOverallDetailProgress = db.define("goals_user_overall_detail_progress", {
        id: { type: 'number', required: true, unique: true },
        tenant_id: { type: 'number'},
        team_id: { type: 'number'},
        user_id: { type: 'number'},
        review_id: { type: 'number'},
        tenant_name: { type: 'text', size:100},
        team_name: { type: 'text', size:100},
        first_name: { type: 'text', size:30},
        last_name: { type: 'text', size:30},
        email_address: { type: 'text'},
        goal_year: { type: 'number'},
        overall:{type:'number'},
    },{
        timestamp: true,
    });


    // add the table to the database 
    db.sync(function(err) {
        if (err) throw err;
    });

    module.exports.Team = Team;
    module.exports.User = User;
    module.exports.Goal = Goal;
    module.exports.Tenant = Tenant;
    module.exports.ReviewGoal = ReviewGoal;
    module.exports.GoalTracking = GoalTracking;
    module.exports.GoalUserOverallDetailProgress = GoalUserOverallDetailProgress;

});

// INSERT INTO `review_system`.`users`
// (`id`,`first_name`,`last_name`,`dob`,`phone_number`,`email_address`,`password`,`is_admin`,`is_active`,`user_id_ref`,`date_created`,`date_modified`,`tenant_id`,`team_id`)
// VALUES
// ('1','admin','admin','2000-01-01',NULL,'admin','f234fbd331db28ab90a5191c84cc5a9392447616ca64b76c9e6ddf9072b777aa','1','1',NULL,NULL,NULL,NULL,NULL);
