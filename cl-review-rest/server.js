db = require('./orm');
http = require('http');
crypto = require('crypto');
express = require('express');
basicAuth = require('basic-auth');
nodemailer = require('nodemailer');
bodyParser = require('body-parser');
smtpTransport = require("nodemailer-smtp-transport")


app = express();

const secret = 'ConradSalt';
var smtpTransport = nodemailer.createTransport(smtpTransport({
    host : "Smtp.gmail.com",
    secureConnection : false,
    port: 587,
    auth : {
            user: "ibtisam.ulhaq@conradlabs.com",
            pass: "Meramahiss1157"
       }
}));

app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
app.use(function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, user-agent");
	next();
});

app.post('/login', function (req, res) {
	res.setHeader('Content-Type', 'application/json');
	hash = crypto.createHmac('sha256', secret).update(req.body.password).digest('hex');
	db.User.find({ email_address: req.body.username, password: hash, is_active:true}).first(function (err, user) {
		if(err){
			res.send(JSON.stringify({ 'status': 'error', 'message':err }));
		}
		if(user){
			res.send(JSON.stringify({ 'status': 'success', 'result': user}));
		}else{
			res.send(JSON.stringify({ 'status': 'error', 'message':'Invalid username / password' }));
		}
	});
	
})


var auth = function (req, res, next) {
	function unauthorized(res) {
		res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
		return res.send(401);
	};
	var user = basicAuth(req);
	if (!user || !user.name || !user.pass) {
		return unauthorized(res);
	};
	db.User.find({ email_address: user.name, password: user.pass}).first(function (err, user) {
		if(err){
			res.send(JSON.stringify({ status: 'error', 'message':"Authentication failed" }));
		}
		if(user){
			req.loggedInUser = user;
			next();

		}else{
			res.send(JSON.stringify({ status: 'error', 'message':"Authentication failed" }));
		}
	});
	
};

var adminAuth = function (req, res, next) {
	function unauthorized(res) {
		res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
		return res.send(401);
	};
	var user = basicAuth(req);
	if (!user || !user.name || !user.pass) {
		return unauthorized(res);
	};
	db.User.find({ email_address: user.name, password: user.pass, is_admin: 1}).first(function (err, user) {
		if(err){
			res.send(JSON.stringify({ status: 'error', 'message':"Authentication failed" }));
		}
		if(user){
			next();
		}else{
			res.send(JSON.stringify({ status: 'error', 'message':"Authentication failed" }));
		}
	});
	
};


/*
* check user authentication
*/
app.get('/check_auth', auth, function (req, res) {
	res.setHeader('Content-Type', 'application/json');
	res.send(JSON.stringify({status:'success'}));
});

/*
* check admin authentication
*/
app.get('/check_admin_auth', adminAuth, function (req, res) {
	res.setHeader('Content-Type', 'application/json');
	res.send(JSON.stringify({status:'success'}));
});




/*
* get user goals with user authentication
*/
app.get('/user_goals', auth, function (req, res) {
	res.setHeader('Content-Type', 'application/json');
	db.ReviewGoal.find({user_id:req.loggedInUser.id}).all(function(err, goals){
		obj = {};
		if (err){
			obj.status = 'error';
			obj.message = 'something went wrong';
			// throw err;	
		}else{ 
			obj.status = 'success';
			obj.result = goals;
		}
		res.send(JSON.stringify(obj));		
	})
})


app.get('/user_goal_detail', auth, function (req, res) {
	res.setHeader('Content-Type', 'application/json');
	db.ReviewGoal.find({user_id:req.loggedInUser.id, goal_year: req.query.goal_year}).first(function(err, reviewGoal){
		if (err){
			res.send(JSON.stringify({status:'error', message:err}));		
			// throw err;	
		}else{ 
			if(reviewGoal && reviewGoal.id){
				db.Goal.find({review_goal_id:reviewGoal.id, is_active: 1}).all(function(err, goals){
					if (err){
						res.send(JSON.stringify({status:'error', message:err}));		
						// throw err;	
					}else{ 
						res.send(JSON.stringify({status:'success', result:goals}));		
					}
				})
			}else{
				res.send(JSON.stringify({status:'error', message:'something went wrong'}));		
			}
		}
	})
})


app.get('/user_goal_tracking', auth, function (req, res) {
	res.setHeader('Content-Type', 'application/json');
	db.GoalTracking.find({goal_id:req.query.id}).order('-time_period').all(function(err, goalTracking){
		if (err){
			res.send(JSON.stringify({status:'error', message:err}));		
			// throw err;	
		}else{ 
			res.send(JSON.stringify({status:'success', result:goalTracking}));		
		}
	})
})


app.get('/get_all_users_weightage', auth, function (req, res) {
	res.setHeader('Content-Type', 'application/json');
		var getQuery = false;
		var obj = {goal_year:req.query.goal_year};
		var limit = 5;
		if(req.query.limit){
			limit = req.query.limit;
		}
		if(req.query.by_team && req.loggedInUser.team){
			obj.team_id = req.loggedInUser.team.id;
			getQuery = true;
		}
		if(req.query.by_tenant && req.loggedInUser.tenant){
			obj.tenant_id = req.loggedInUser.tenant.id;
			getQuery = true;
		}
		if(getQuery){
			db.GoalUserOverallDetailProgress.aggregate(obj).max("id").groupBy("review_id").get(function (err, result) {
				if (err){
					res.send(JSON.stringify({status:'error', message:err}));		
					// throw err;	
				}else{ 
					if(result != null){
						var tempIDArr = [];
						for(var i = 0; i < result.length; i++){
							tempIDArr.push(result[i].max_id);
						}
						db.GoalUserOverallDetailProgress.find({id:tempIDArr}).order('-overall').limit(limit).all(function(err, detailedData){
							if (err){
								res.send(JSON.stringify({status:'error', message:err}));		
								// throw err;	
							}else{ 
								res.send(JSON.stringify({status:'success', result:detailedData}));		
							}
						})
					}else{
						res.send(JSON.stringify({status:'success', result:{}}));		
					}
				}
			})
		}else{
			res.send(JSON.stringify({status:'success', result:{}}));		
		}
	// db.GoalUserOverallDetailProgress.groupBy('review_id').get(function(err, goalTracking){
	// 	if (err){
	// 		res.send(JSON.stringify({status:'error', message:err}));		
	// 		// throw err;	
	// 	}else{ 
	// 		res.send(JSON.stringify({status:'success', result:goalTracking}));		
	// 	}
	// })
})



var year = 0;
var user_id = 0;
var review_id = 0;
var totalGoals = 0;
var totalweightage = 0;


var insertEntryInDetailedTable = function(user){
	obj = {};
	obj.tenant_id = user.tenant.id;
	obj.team_id = user.team.id;
	obj.user_id = user.id;
	obj.review_id = review_id;
	obj.tenant_name = user.tenant.name;
	obj.team_name = user.team.name;
	obj.first_name = user.first_name;
	obj.last_name = user.last_name;
	obj.email_address = user.email_address;
	obj.goal_year = year;
	obj.overall = totalweightage;


	db.GoalUserOverallDetailProgress.create(obj, function(err) {
		if (err) {
			console.log('error',err);
			// throw err;
		}else{
			console.log('Detailed data has been inserted successfully.');
			// complete
		}
	});

}

var getGoalWeightage = function(goal){
	db.GoalTracking.find({goal_id:goal.id}).order('-time_period').first(function(err, goalTracking){
		if (err){
			// throw err;	
		}else{ 
			totalGoals --;
			if(goalTracking != null){
				totalweightage += (goalTracking.progress/100)*goal.weightage;
				if(totalGoals <= 0){
					db.User.find({id:user_id}).first(function(err, user){
						if (err){
							// throw err;	
						}else{ 
							insertEntryInDetailedTable(user)
						}
					})

				}
			}
		}
	})
}

var getInforRelatedToDetailedTable = function(goalTracker){
	year = 0;
	user_id = 0;
	review_id = 0;
	totalGoals = 0;
	totalweightage = 0;

	if(goalTracker && goalTracker.goal){
		review_id = goalTracker.goal.review_goal_id;
		if(goalTracker.goal.review_goal){
			year = goalTracker.goal.review_goal.goal_year;
			if(goalTracker.goal.review_goal.user){
				user_id = goalTracker.goal.review_goal.user.id;
			}

		}
	}
}

var updateDetailOverallScoreTable = function(){

	if(review_id){
		db.Goal.find({review_goal_id:review_id, is_active:true}).all(function(err, goals){
			if (err){
				// throw err;	
			}else{ 
				totalGoals = goals.length;
				for(var i = 0; i < goals.length; i++){
					getGoalWeightage(goals[i]);
				}
			}
		})
	}
}

// ***************************************************
// ***************************************************
// **                With Admin Auth                **
// ***************************************************
// ***************************************************


// ***********************************
// **            Tenants            **
// ***********************************
app.get('/tenants', adminAuth, function (req, res) {
	res.setHeader('Content-Type', 'application/json');
	db.Tenant.find({}).all(function (err, tenants) {
		obj = {};
		if (err){
			obj.status = 'error';
			obj.message = 'something went wrong';
			// throw err;	
		}else{ 
			obj.status = 'success';
			obj.result = tenants;
		}
		res.send(JSON.stringify(obj));
	});
})

app.post('/tenant', adminAuth, function (req, res) {
	res.setHeader('Content-Type', 'application/json');
	obj = {};
	obj.name = req.body.name;
	db.Tenant.create(obj, function(err) {
		if (err) {
			res.send(JSON.stringify({ status: 'error', 'message':err }));
			// throw err;
		}else{
			res.send(JSON.stringify({ status: 'success' }));
		}
	});
    	
})

app.put('/tenant', adminAuth, function (req, res) {
	
	res.setHeader('Content-Type', 'application/json');
	db.Tenant.find({ id: req.body.id }).first(function (err, tenant) {
		if (err) {
			res.send(JSON.stringify({ status: 'error', 'message':err }));
			// throw err;
		}
		if(req.body.name){
			tenant.name = req.body.name;
		}
		tenant.save(function (err) {
			if (err) {
				res.send(JSON.stringify({ status: 'error', 'message':err }));
				// throw err;
			}else{
				res.send(JSON.stringify({ status: 'success' }));
			}
		});
	});
})


app.delete('/tenant', adminAuth, function (req, res) {
	
	res.setHeader('Content-Type', 'application/json');
	db.Tenant.find({ id: req.query.id }).first(function (err, tenant) {
		if (err) {
			res.send(JSON.stringify({ status: 'error', 'message':err }));
			// throw err;
		}else{
			tenant.remove(function(err){
				if (err) {
					res.send(JSON.stringify({ status: 'error', 'message':err }));
					// throw err;
				}else{
					res.send(JSON.stringify({ status: 'success'}));

				}
			});
		}
	});
});




// ***********************************
// **             Teams             **
// ***********************************
app.get('/teams', adminAuth, function (req, res) {
	res.setHeader('Content-Type', 'application/json');
	var options = {};
	if(req.query && req.query.tenant_id){
		options.tenant_id = req.query.tenant_id;
	}

	db.Team.find(options).all(function (err, teams) {
		obj = {};
		if (err){
			obj.status = 'error';
			obj.message = 'something went wrong';
			// throw err;	
		}else{ 
			obj.status = 'success';
			obj.result = teams;
		}
		res.send(JSON.stringify(obj));
	});
})

app.post('/team', adminAuth, function (req, res) {
	res.setHeader('Content-Type', 'application/json');
	obj = {};
	obj.name = req.body.name;
	obj.tenant_id = req.body.tenant_id;

	db.Team.create(obj, function(err) {
		if (err) {
			res.send(JSON.stringify({ status: 'error', 'message':err }));
			// throw err;
		}else{
			res.send(JSON.stringify({ status: 'success' }));
		}
	});
    	
})

app.put('/team', adminAuth, function (req, res) {
	
	res.setHeader('Content-Type', 'application/json');
	db.Team.find({ id: req.body.id }).first(function (err, team) {
		if (err) {
			res.send(JSON.stringify({ status: 'error', 'message':err }));
			// throw err;
		}
		if(req.body.name){
			team.name = req.body.name;
		}
		if(req.body.tenant_id){
			team.tenant_id = req.body.tenant_id;
		}
		team.save(function (err) {
			if (err) {
				res.send(JSON.stringify({ status: 'error', 'message':err }));
				// throw err;
			}else{
				res.send(JSON.stringify({ status: 'success' }));
			}
		});
	});
})


app.delete('/team', adminAuth, function (req, res) {
	
	res.setHeader('Content-Type', 'application/json');
	db.Team.find({ id: req.query.id }).first(function (err, team) {
		if (err) {
			res.send(JSON.stringify({ status: 'error', 'message':err }));
			// throw err;
		}else{
			team.remove(function(err){
				if (err) {
					res.send(JSON.stringify({ status: 'error', 'message':err }));
					// throw err;
				}else{
					res.send(JSON.stringify({ status: 'success'}));

				}
			});
		}
	});
});





// ***********************************
// **             Users             **
// ***********************************
app.get('/users', adminAuth, function (req, res) {
	res.setHeader('Content-Type', 'application/json');
	db.User.find({is_active:1}).all(function (err, users) {
		obj = {};
		if (err){
			obj.status = 'error';
			obj.message = 'something went wrong';
			// throw err;	
		}else{ 
			obj.status = 'success';
			obj.result = users;
		}
		res.send(JSON.stringify(obj));
	});
})

app.post('/user', adminAuth, function (req, res) {
	res.setHeader('Content-Type', 'application/json');
	hash = crypto.createHmac('sha256', secret).update(req.body.password).digest('hex');
	obj = {};
	obj.first_name = req.body.first_name;
	obj.last_name = req.body.last_name;
	obj.dob = new Date(req.body.dob);
	obj.phone_number = req.body.phone;
	obj.is_admin = req.body.is_admin=="1"?true:false;
	obj.email_address = req.body.email_address;
	obj.password = hash;
	obj.tenant_id = req.body.tenant_id
	obj.team_id = req.body.team_id
	db.User.create(obj, function(err) {
		if (err) {
			res.send(JSON.stringify({ status: 'error', 'message':err }));
			// throw err;
		}else{
			var mailOptions = {
				from: 'Ibtisam ul Haq <ibtisam.ulhaq@conradlabs.com>',
				subject: 'Welcome to ConradLabs Review System', 				
			};
			mailOptions['to'] = '"'+obj.first_name+' '+obj.last_name+'" <'+obj.email_address+'>';
			mailOptions['html'] = "Hi "+obj.first_name+" "+obj.last_name+", <br /> Admin has created an account for you, please login though this <a href='http://192.168.88.62:8082/login.html'>link</a>. <br/><br/> Your username: <strong>"+obj.email_address+"</strong><br/> Password: <strong>"+req.body.password+"</stong> <br/> <br/> -- <br/> Regards <br/> ConradLabs Review Team";
			smtpTransport.sendMail(mailOptions, function(error, response){
				if(error){
					res.end("error");
				}else{
					res.end("sent");
				}
			});
			res.send(JSON.stringify({ status: 'success' }));
		}
	});
    	
})

app.put('/user', adminAuth, function (req, res) {
	
	res.setHeader('Content-Type', 'application/json');
	db.User.find({ id: req.body.id }).first(function (err, user) {
		if (err) {
			res.send(JSON.stringify({ status: 'error', 'message':err }));
			// throw err;
		}
		var updateTenant = false;
		var updateTeam = false;
		var userActualObj = {};
		var userRefObj = {};
		userActualObj.dob = userRefObj.dob = user.dob;
		userActualObj.email_address = userRefObj.email_address = user.email_address;
		userActualObj.first_name = userRefObj.first_name = user.first_name;
		userActualObj.last_name = userRefObj.last_name = user.last_name;
		userActualObj.is_admin = userRefObj.is_admin = user.is_admin;
		userActualObj.password = userRefObj.password = user.password;
		userActualObj.phone_number = userRefObj.phone_number = user.phone_number;
		userActualObj.team_id = userRefObj.team_id = user.team_id;
		userActualObj.tenant_id = userRefObj.tenant_id = user.tenant_id;

		userActualObj.id = user.id;
		userRefObj.user_id_ref = user.id;
		userRefObj.is_active = false;
		
		if(req.body.first_name){
			userActualObj.first_name = req.body.first_name;
		}
		if(req.body.last_name){
			userActualObj.last_name = req.body.last_name;
		}
		if(req.body.dob){
			userActualObj.dob = new Date(req.body.dob);
		}
		if(req.body.phone){
			userActualObj.phone_number = req.body.phone;
		}
		if(req.body.email_address){
			userActualObj.email_address = req.body.email_address;
		}

		if(req.body.tenant_id){
			if(req.body.tenant_id != userActualObj.tenant_id){
				updateTenant = true;
			}
			userActualObj.tenant_id = req.body.tenant_id;
		}
		if(req.body.team_id){
			if(req.body.team_id != userActualObj.team_id){
				updateTeam = true;
			}
			userActualObj.team_id = req.body.team_id;
		}

		if(req.body.password){
			hash = crypto.createHmac('sha256', secret).update(req.body.password).digest('hex');
			userActualObj.password = hash;
		}
		userActualObj.is_admin = req.body.is_admin=="1"?true:false;
		user.remove(function(err){
			if (err) {
				res.send(JSON.stringify({ status: 'error', 'message':err }));
			}else{
				db.User.create(userActualObj, function(err) {
					if (err) {
						res.send(JSON.stringify({ status: 'error', 'message':err }));
					}else{
						if(updateTenant || updateTeam){
							db.User.create(userRefObj, function(err) {
								if (err) {
									res.send(JSON.stringify({ status: 'error', 'message':err }));
									// throw err;
								}else{
									res.send(JSON.stringify({ status: 'success' }));
								}
							});
						}else{
							res.send(JSON.stringify({ status: 'success' }));
						}
					}
				});				
			}
		});
	});
})


app.delete('/user', adminAuth, function (req, res) {
	
	res.setHeader('Content-Type', 'application/json');
	db.User.find({ id: req.query.id }).first(function (err, user) {
		if (err) {
			res.send(JSON.stringify({ status: 'error', 'message':err }));
			// throw err;
		}else{
			user.remove(function(err){
				if (err) {
					res.send(JSON.stringify({ status: 'error', 'message':err }));
					// throw err;
				}else{
					res.send(JSON.stringify({ status: 'success'}));

				}
			});
		}
	});
});



// ***********************************
// **         Review Goals          **
// ***********************************
app.get('/review_goals', adminAuth, function (req, res) {
	res.setHeader('Content-Type', 'application/json');
	var options = {};
	if(req.query && req.query.user_id){
		options.user_id = req.query.user_id;
	}
	if(req.query && req.query.id){
		options.id = req.query.id;
	}

	db.ReviewGoal.find(options).all(function (err, reviewGoals) {
		obj = {};
		if (err){
			obj.status = 'error';
			obj.message = 'something went wrong';
			// throw err;	
		}else{ 
			obj.status = 'success';
			obj.result = reviewGoals;
		}
		res.send(JSON.stringify(obj));
	});
})

app.post('/review_goal', adminAuth, function (req, res) {
	res.setHeader('Content-Type', 'application/json');
	obj = {};
	obj.user_id = req.body.user_id;
	var temp_date = new Date(req.body.goal_year);
	obj.goal_year = temp_date.getFullYear();
	db.ReviewGoal.create(obj, function(err) {
		if (err) {
			res.send(JSON.stringify({ status: 'error', 'message':err }));
			// throw err;
		}else{
			res.send(JSON.stringify({ status: 'success' }));
		}
	});
    	
})


app.put('/review_goal', adminAuth, function (req, res) {
	
	res.setHeader('Content-Type', 'application/json');
	db.ReviewGoal.find({ id: req.body.id }).first(function (err, review_goal) {
		if (err) {
			res.send(JSON.stringify({ status: 'error', 'message':err }));
			// throw err;
		}
		review_goal.user_id = req.body.user_id;
		var temp_date = new Date(req.body.goal_year);
		review_goal.goal_year = temp_date.getFullYear();
		db.User.find({id: review_goal.user_id}).first(function(err, user){
			if(err){
				res.send(JSON.stringify({status: 'error', message:err}));
			}
			review_goal.user = user;
			review_goal.save(function (err) {
				if (err) {
					res.send(JSON.stringify({ status: 'error', 'message':err }));
					// throw err;
				}else{
					res.send(JSON.stringify({ status: 'success' }));
				}
			});			
		})
	});
})


app.delete('/review_goal', adminAuth, function (req, res) {	
	res.setHeader('Content-Type', 'application/json');
	db.ReviewGoal.find({ id: req.query.id }).first(function (err, review_goal) {
		if (err) {
			res.send(JSON.stringify({ status: 'error', 'message':err }));
			// throw err;
		}else{
			review_goal.remove(function(err){
				if (err) {
					res.send(JSON.stringify({ status: 'error', 'message':err }));
					// throw err;
				}else{
					res.send(JSON.stringify({ status: 'success'}));

				}
			});
		}
	});
});


// ***********************************
// **             Goals             **
// ***********************************
app.get('/goals', adminAuth, function (req, res) {
	res.setHeader('Content-Type', 'application/json');
	var options = {};
	options.is_active = 1;
	if(req.query && req.query.review_goal_id){
		options.review_goal_id = req.query.review_goal_id;
	}
	if(req.query && req.query.id){
		options.id = req.query.id;
	}
	// console.log(db.Goal);
	
	db.Goal.find(options).all(function (err, goals) {
		obj = {};
		if (err){
			obj.status = 'error';
			obj.message = 'something went wrong';
			// throw err;	
		}else{ 
			obj.status = 'success';
			obj.result = goals;
		}
		res.send(JSON.stringify(obj));
	});
})

app.post('/goal', adminAuth, function (req, res) {
	res.setHeader('Content-Type', 'application/json');
	obj = {};
	obj.review_goal_id = req.body.review_goal_id;
	obj.goal_text = req.body.goal_text;
	obj.weightage = req.body.weightage;

	db.Goal.create(obj, function(err) {
		if (err) {
			res.send(JSON.stringify({ status: 'error', 'message':err }));
			// throw err;
		}else{
			res.send(JSON.stringify({ status: 'success' }));
		}
	});
    	
})


app.put('/goal', adminAuth, function (req, res) {
	
	res.setHeader('Content-Type', 'application/json');
	db.Goal.find({ id: req.body.id }).first(function (err, goal) {
		if (err) {
			res.send(JSON.stringify({ status: 'error', 'message':err }));
			// throw err;
		}
		obj = JSON.parse(JSON.stringify(goal));
		obj.goal_id = obj.id;
		obj.id = undefined;
		obj.is_active = 0;

		goal.review_goal_id = req.body.review_goal_id;
		if(req.body.goal_text){
			goal.goal_text = req.body.goal_text;
		}
		if(req.body.weightage){
			goal.weightage = req.body.weightage;
		}
		db.ReviewGoal.find({id:goal.review_goal_id}).first(function(err, review_goal){
			if(err){
				res.send(JSON.stringify({status: 'error', message: err}))
			}
			goal.review_goal = review_goal;
			goal.save(function (err) {
				if (err) {
					res.send(JSON.stringify({ status: 'error', 'message':err }));
					// throw err;
				}else{
					db.Goal.create(obj, function(err) {
						if (err) {
							res.send(JSON.stringify({ status: 'error', 'message':err }));
							// throw err;
						}else{
							res.send(JSON.stringify({ status: 'success' }));
						}
					});
				}
			});
		})
	});
})


app.delete('/goal', adminAuth, function (req, res) {	
	res.setHeader('Content-Type', 'application/json');
	db.Goal.find({ id: req.query.id }).first(function (err, goal) {
		if (err) {
			res.send(JSON.stringify({ status: 'error', 'message':err }));
			// throw err;
		}else{
			obj = JSON.parse(JSON.stringify(goal));
			obj.goal_id = obj.id;
			obj.id = undefined;
			obj.is_active = 0;
			goal.weightage = 0;
			goal.save(function (err) {
				if (err) {
					res.send(JSON.stringify({ status: 'error', 'message':err }));
					// throw err;
				}else{
					db.Goal.create(obj, function(err) {
						if (err) {
							res.send(JSON.stringify({ status: 'error', 'message':err }));
							// throw err;
						}else{
							res.send(JSON.stringify({ status: 'success' }));
						}
					});
				}
			});
		}
	});
});



// ***********************************
// **         Goal Tracking         **
// ***********************************
app.get('/goal_tracking_list', adminAuth, function (req, res) {
	res.setHeader('Content-Type', 'application/json');
	console.log(req.query.review_goal_id);
	if(req.query && req.query.user_id && req.query.review_goal_id){
		// db.Goal.aggregate({review_goal_id:req.query.review_goal_id}).max("id").groupBy("review_id").get(function (err, result) {
		db.Goal.find({review_goal_id:req.query.review_goal_id, is_active: 1}).all(function(err, goals){
			if (err){
				res.send(JSON.stringify({status:'error', message:err}));		
				// throw err;	
			}else{ 
				var tempIDArr = [];
				for(var i = 0; i < goals.length; i++){
					tempIDArr.push(goals[i].id);
				}
				// db.GoalUserOverallDetailProgress.find({id:tempIDArr}).order('-overall').limit(limit).all(function(err, detailedData){
				// console.log(tempIDArr);
				db.GoalTracking.find({goal_id:tempIDArr}).all(function(err, goalTracking){
					if (err){
						res.send(JSON.stringify({status:'error', message:err}));		
						// throw err;	
					}else{ 
						res.send(JSON.stringify({status:'success', result:goalTracking}));		
					}
				})
			}
		})
		
	}else{
		db.GoalTracking.find({}).all(function (err, goal_tracking_list) {
			obj = {};
			if (err){
				obj.status = 'error';
				obj.message = 'something went wrong';
				// throw err;	
			}else{ 
				obj.status = 'success';
				obj.result = goal_tracking_list;
			}
			res.send(JSON.stringify(obj));
		});
	}
})

app.post('/goal_tracker', adminAuth, function (req, res) {
	res.setHeader('Content-Type', 'application/json');
	obj = {};
	obj.goal_id = req.body.goal_id;
	obj.progress = req.body.progress;
	obj.comments = req.body.comments;
	obj.time_period = new Date(req.body.time_period);

	db.GoalTracking.create(obj, function(err) {
		if (err) {
			res.send(JSON.stringify({ status: 'error', 'message':err }));
			// throw err;
		}else{
			db.GoalTracking.find().order('-id').first(function (err, goal_tracker) {
				if (err) {
					// throw err;
				}else{
					getInforRelatedToDetailedTable(goal_tracker);
					updateDetailOverallScoreTable();
				}
			});
			res.send(JSON.stringify({ status: 'success' }));
		}
	});
    	
})


app.put('/goal_tracker', adminAuth, function (req, res) {
	
	res.setHeader('Content-Type', 'application/json');
	db.GoalTracking.find({ id: req.body.id }).first(function (err, goal_tracker) {
		if (err) {
			res.send(JSON.stringify({ status: 'error', 'message':err }));
			// throw err;
		}
		goal_tracker.comments = req.body.comments;
		goal_tracker.progress = req.body.progress;
		goal_tracker.time_period = new Date(req.body.time_period);
		goal_tracker.save(function (err) {
			if (err) {
				res.send(JSON.stringify({ status: 'error', 'message':err }));
				// throw err;
			}else{
				getInforRelatedToDetailedTable(goal_tracker);
				updateDetailOverallScoreTable();
				res.send(JSON.stringify({ status: 'success' }));
			}
		});
	});
})


app.delete('/goal_tracker', adminAuth, function (req, res) {	
	res.setHeader('Content-Type', 'application/json');
	db.GoalTracking.find({ id: req.query.id }).first(function (err, goal_tracker) {
		if (err) {
			res.send(JSON.stringify({ status: 'error', 'message':err }));
			// throw err;
		}else{
			getInforRelatedToDetailedTable(goal_tracker);
			goal_tracker.remove(function(err){
				if (err) {
					res.send(JSON.stringify({ status: 'error', 'message':err }));
					// throw err;
				}else{
					updateDetailOverallScoreTable();
					res.send(JSON.stringify({ status: 'success'}));

				}
			});
		}
	});
});



var server = app.listen(8081, function () {

  var host = server.address().address
  var port = server.address().port

  console.log("Example app listening at http://%s:%s", host, port)

})