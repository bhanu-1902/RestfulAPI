//Bring in express server and create application
let express = require('express');
let app = express();
let pieRepo = require('./repos/pieRepo');
let errorHelper = require('./helpers/errorHelpers');
let cors = require('cors');

//Express router object
let router = express.Router();

//Configure middleware to support JSON data parsing in request object
app.use(express.json());

//Configure CORS
app.use(cors());

//Create GET to return a list of all pies 
router.get('/', function (req, res, next) {
    pieRepo.get(function (data) {
        res.status(200).json(
            {
                "status": 200,
                "statustext": "OK",
                "message": "All pies retrieved",
                "data": data
            }
        );
    },
        function (err) {
            next(err);
        }
    );
});


router.get('/search', function (req, res, next) {

    let searchObject = {
        "id": req.query.id,
        "name": req.query.name
    };

    pieRepo.search(searchObject, function (data) {
        res.status(200).json(
            {
                "status": 200,
                "statustext": "OK",
                "message": "All pies retrieved",
                "data": data
            }
        );
    },
        function (err) {
            next(err);
        }
    );
});


router.get('/:id', function (req, res, next) {
    pieRepo.getById(req.params.id, function (data) {
        if (data) {
            res.status(200).json(
                {
                    "status": 200,
                    "statustext": "OK",
                    "message": "Single pie retrieved",
                    "data": data
                }
            );
        }
        else {
            res.status(404).json(
                {
                    "status": 404,
                    "statustext": "Not Found",
                    "message": "Ths pie '" + req.params.id + "' could not be found.",
                    "error": {
                        "code": "NOT_FOUND",
                        "message": "Ths pie '" + req.params.id + "' could not be found.",
                    }
                });
        }
    },
        function (err) {
            next(err);
        });
});

router.post('/', function (req, res, next) {
    pieRepo.insert(req.body, function (data) {
        res.status(201).json({
            "status": 201,
            "statusText": "Created OK",
            "message": "New pie added",
            "data": data
        });
    },
        function (err) {
            next(err);
        }
    );
});

router.put('/:id', function (req, res, next) {
    pieRepo.getById(req.params.id, function (data) {
        if (data) {
            //Attempt to update data
            pieRepo.update(req.body, req.params.id, function (data) {
                res.status(200).json({
                    "status": 200,
                    "statustext": "OK",
                    "message": "Pie " + req.params.id + " updated.",
                    "data": data
                });
            });

        }
        else {
            res.status(404).json(
                {
                    "status": 404,
                    "statustext": "Not Found",
                    "message": "Ths pie '" + req.params.id + "' could not be found.",
                    "error": {
                        "code": "NOT_FOUND",
                        "message": "Ths pie '" + req.params.id + "' could not be found.",
                    }
                });
        }
    },
        function (err) {
            next(err);
        }
    );
});


router.patch('/:id', function (req, res, next) {
    pieRepo.getById(req.params.id, function (data) {
        if (data) {
            //Attempt to update data
            pieRepo.update(req.body, req.params.id, function (data) {
                res.status(200).json({
                    "status": 200,
                    "statustext": "OK",
                    "message": "Pie " + req.params.id + " patched.",
                    "data": "Pie " + req.params.id + " patched."
                });
            });

        }
        else {
            res.status(404).json(
                {
                    "status": 404,
                    "statustext": "Not Found",
                    "message": "Ths pie '" + req.params.id + "' could not be found.",
                    "error": {
                        "code": "NOT_FOUND",
                        "message": "Ths pie '" + req.params.id + "' could not be found.",
                    }
                });
        }
    }, function (err) {
        next(err);
    }
    );
});

router.delete('/:id', function (req, res, next) {
    pieRepo.getById(req.params.id, function (data) {
        if (data) {
            //Attempt to delete data
            pieRepo.delete(req.params.id, function (data) {
                res.status(200).json({
                    "status": 200,
                    "statustext": "OK",
                    "message": "Pie " + req.params.id + " is deleted.",
                    "data": "Pie " + req.params.id + " deleted."
                });
            });

        }
        else {
            res.status(404).json(
                {
                    "status": 404,
                    "statustext": "Not Found",
                    "message": "Ths pie '" + req.params.id + "' could not be found.",
                    "error": {
                        "code": "NOT_FOUND",
                        "message": "Ths pie '" + req.params.id + "' could not be found.",
                    }
                });
        }
    }, function (err) {
        next(err);
    }
    );
});

//Configure router so all routes are prefixed with /api/v1
app.use('/api', router);

//Configure exception logger to console
app.use(errorHelper.logErrorsToConsole);

//Configure exception logger to file
app.use(errorHelper.logErrorsToFile);

//Configure client error handler
app.use(errorHelper.clientErrorHandler);

//Configure catch-all  exception middleware last  
app.use(errorHelper.errorHandler);

//Create the server to listen to port 500
var server = app.listen(5000, function () {
    console.log("Node server is running on http://localhost:5000");
});

