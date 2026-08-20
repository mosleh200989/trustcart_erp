$templates = @{
    "payroll-runs" = @{
        interface = "PayrollRun"
        fields = @{
            name = "string"
            periodStart = "string"
            periodEnd = "string"
            status = "string"
            processedDate = "string"
        }
        api = "/hrm/payroll-runs"
        title = "Payroll Runs"
        addButton = "Add New Payroll Run"
    }
    "payslips" = @{
        interface = "Payslip"
        fields = @{
            employeeId = "number"
            payrollRunId = "number"
            grossSalary = "number"
            netSalary = "number"
            generatedDate = "string"
        }
        api = "/hrm/payslips"
        title = "Payslips"
        addButton = "Add New Payslip"
    }
}
