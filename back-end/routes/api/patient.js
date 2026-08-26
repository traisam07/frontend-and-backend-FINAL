const express = require('express');
const router = express.Router();
const patientController = require('../../controllers/patientController');
// const ROLES_LIST = require('../../config/roles_list');
// const verifyRoles = require('../../middleware/verifyRoles');

/**
 * THE LIST ENDPOINT — **G-40**.
 *
 * `getAllPatient` existed in the controller and was exported, but it was routed nowhere, so the
 * Patient Overview board had no endpoint to call at all. Mounting it here is the whole fix.
 *
 * It is declared BEFORE the `:patient_id` routes. Nothing below actually collides with `/all`
 * (every other path is two segments deep under its own prefix), but declaring the literal first is
 * the habit that keeps a future `/patient/:patient_id` route from swallowing it.
 */
router.route('/all').get(patientController.getAllPatient);

router.route('/info/:patient_id').get(patientController.getPatientInfo);

router.route('/warning/:patient_id').get(patientController.getWarning);

router
    .route('/reading/:patient_id')
    .get(patientController.getPatientReading)
    // `createNewPatient` is a real handler now; naming an undefined one here is what threw a
    // ReferenceError at module load and stopped the server from booting (**G-44**).
    .post(patientController.createNewPatient);

/** Optional bulk import from the FastAPI-style producer (**G-47**). */
router.route('/import/producer').post(patientController.create100NewPatient);

module.exports = router;
