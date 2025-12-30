$prepareDataFunc = @'

  const prepareData = (data: any) => {
    const prepared = { ...data };
    const idFields = ['branchId', 'departmentId', 'employeeId', 'managerId', 'designationId', 'awardTypeId', 
                      'fromBranchId', 'toBranchId', 'fromDepartmentId', 'toDepartmentId', 
                      'fromDesignationId', 'toDesignationId', 'typeId', 'categoryId', 'roomId', 'cycleId',
                      'goalTypeId', 'indicatorId', 'candidateId', 'jobPostingId', 'roundId', 
                      'componentId', 'policyId', 'leaveTypeId', 'sessionId', 'programId', 'templateId'];
    idFields.forEach(field => {
      if (prepared[field] && prepared[field] !== '') {
        prepared[field] = Number(prepared[field]);
      }
    });
    return prepared;
  };
'@

$files = Get-ChildItem "c:\xampp\htdocs\trustcart_erp\frontend\src\pages\admin\hrm" -Filter "*.tsx" -Recurse -Exclude "branches.tsx","departments.tsx","employees.tsx"

$count = 0
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    
    # Check if file uses prepareData but doesn't define it
    if ($content -match 'prepareData\(formData\)' -and $content -notmatch 'const prepareData =') {
        # Find the pattern and replace
        $pattern = '(\s+)(const handleSubmit = async \(e: React\.FormEvent\) \{\s+e\.preventDefault\(\);\s+try \{)'
        $replacement = "`$1$prepareDataFunc`$1const handleSubmit = async (e: React.FormEvent) {`$1  e.preventDefault();`$1  try {"
        
        $newContent = $content -replace $pattern, $replacement
        
        if ($newContent -ne $content) {
            Set-Content $file.FullName -Value $newContent -NoNewline
            $count++
            Write-Host "✓ Updated: $($file.Name)"
        }
    }
}

Write-Host ""
Write-Host "========================================="
Write-Host "Total files updated: $count"
Write-Host "========================================="
Write-Host ""
