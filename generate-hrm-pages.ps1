# PowerShell script to generate all remaining HRM pages

$pageDefinitions = @(
    # Leave Management
    @{folder="leave-management"; file="leave-types.tsx"; interface="LeaveType"; title="Leave Types"; api="/hrm/leave-types"; fields=@("name:string", "code:string", "days:number", "isCarryForward:boolean", "isActive:boolean")},
    @{folder="leave-management"; file="leave-policies.tsx"; interface="LeavePolicy"; title="Leave Policies"; api="/hrm/leave-policies"; fields=@("name:string", "description:string", "maxDays:number", "isActive:boolean")},
    @{folder="leave-management"; file="leave-applications.tsx"; interface="LeaveApplication"; title="Leave Applications"; api="/hrm/leave-applications"; fields=@("employeeId:number", "leaveTypeId:number", "startDate:string", "endDate:string", "reason:string", "status:string")},
    @{folder="leave-management"; file="leave-balances.tsx"; interface="LeaveBalance"; title="Leave Balances"; api="/hrm/leave-balances"; fields=@("employeeId:number", "leaveTypeId:number", "totalDays:number", "usedDays:number", "remainingDays:number")},
    
    # Recruitment
    @{folder="recruitment"; file="job-categories.tsx"; interface="JobCategory"; title="Job Categories"; api="/hrm/job-categories"; fields=@("name:string", "code:string", "description:string", "isActive:boolean")},
    @{folder="recruitment"; file="job-requisitions.tsx"; interface="JobRequisition"; title="Job Requisitions"; api="/hrm/job-requisitions"; fields=@("title:string", "departmentId:number", "positions:number", "urgency:string", "status:string")},
    @{folder="recruitment"; file="job-types.tsx"; interface="JobType"; title="Job Types"; api="/hrm/job-types"; fields=@("name:string", "code:string", "description:string", "isActive:boolean")},
    @{folder="recruitment"; file="job-locations.tsx"; interface="JobLocation"; title="Job Locations"; api="/hrm/job-locations"; fields=@("name:string", "city:string", "country:string", "isActive:boolean")},
    @{folder="recruitment"; file="job-postings.tsx"; interface="JobPosting"; title="Job Postings"; api="/hrm/job-postings"; fields=@("title:string", "description:string", "requirements:string", "salary:number", "status:string")},
    @{folder="recruitment"; file="candidate-sources.tsx"; interface="CandidateSource"; title="Candidate Sources"; api="/hrm/candidate-sources"; fields=@("name:string", "code:string", "description:string", "isActive:boolean")},
    @{folder="recruitment"; file="candidates.tsx"; interface="Candidate"; title="Candidates"; api="/hrm/candidates"; fields=@("name:string", "email:string", "phone:string", "resume:string", "status:string")},
    @{folder="recruitment"; file="interview-types.tsx"; interface="InterviewType"; title="Interview Types"; api="/hrm/interview-types"; fields=@("name:string", "code:string", "description:string", "isActive:boolean")},
    @{folder="recruitment"; file="interview-rounds.tsx"; interface="InterviewRound"; title="Interview Rounds"; api="/hrm/interview-rounds"; fields=@("name:string", "sequence:number", "description:string", "isActive:boolean")},
    @{folder="recruitment"; file="interviews.tsx"; interface="Interview"; title="Interviews"; api="/hrm/interviews"; fields=@("candidateId:number", "interviewDate:string", "interviewerIds:string", "status:string", "feedback:string")},
    @{folder="recruitment"; file="interview-feedback.tsx"; interface="InterviewFeedback"; title="Interview Feedback"; api="/hrm/interview-feedback"; fields=@("interviewId:number", "rating:number", "comments:string", "recommendation:string")},
    @{folder="recruitment"; file="assessments.tsx"; interface="Assessment"; title="Assessments"; api="/hrm/assessments"; fields=@("candidateId:number", "assessmentType:string", "score:number", "completedDate:string", "status:string")},
    @{folder="recruitment"; file="offer-templates.tsx"; interface="OfferTemplate"; title="Offer Templates"; api="/hrm/offer-templates"; fields=@("name:string", "subject:string", "body:string", "isActive:boolean")},
    @{folder="recruitment"; file="offers.tsx"; interface="Offer"; title="Offers"; api="/hrm/offers"; fields=@("candidateId:number", "position:string", "salary:number", "joiningDate:string", "status:string")},
    @{folder="recruitment"; file="onboarding-checklists.tsx"; interface="OnboardingChecklist"; title="Onboarding Checklists"; api="/hrm/onboarding-checklists"; fields=@("name:string", "description:string", "isActive:boolean")},
    @{folder="recruitment"; file="checklist-items.tsx"; interface="ChecklistItem"; title="Checklist Items"; api="/hrm/checklist-items"; fields=@("checklistId:number", "itemName:string", "description:string", "sequence:number")},
    @{folder="recruitment"; file="candidate-onboarding.tsx"; interface="CandidateOnboarding"; title="Candidate Onboarding"; api="/hrm/candidate-onboarding"; fields=@("candidateId:number", "checklistId:number", "status:string", "completedDate:string")},
    
    # Contract Management
    @{folder="contract-management"; file="contract-types.tsx"; interface="ContractType"; title="Contract Types"; api="/hrm/contract-types"; fields=@("name:string", "code:string", "description:string", "isActive:boolean")},
    @{folder="contract-management"; file="employee-contracts.tsx"; interface="EmployeeContract"; title="Employee Contracts"; api="/hrm/employee-contracts"; fields=@("employeeId:number", "contractTypeId:number", "startDate:string", "endDate:string", "status:string")},
    @{folder="contract-management"; file="contract-renewals.tsx"; interface="ContractRenewal"; title="Contract Renewals"; api="/hrm/contract-renewals"; fields=@("contractId:number", "renewalDate:string", "newEndDate:string", "status:string")},
    @{folder="contract-management"; file="contract-templates.tsx"; interface="ContractTemplate"; title="Contract Templates"; api="/hrm/contract-templates"; fields=@("name:string", "content:string", "isActive:boolean")},
    
    # Document Management
    @{folder="document-management"; file="document-categories.tsx"; interface="DocumentCategory"; title="Document Categories"; api="/hrm/document-categories"; fields=@("name:string", "code:string", "description:string", "isActive:boolean")},
    @{folder="document-management"; file="hr-documents.tsx"; interface="HrDocument"; title="HR Documents"; api="/hrm/hr-documents"; fields=@("title:string", "categoryId:number", "filePath:string", "uploadDate:string", "isActive:boolean")},
    @{folder="document-management"; file="acknowledgments.tsx"; interface="Acknowledgment"; title="Acknowledgments"; api="/hrm/acknowledgments"; fields=@("documentId:number", "employeeId:number", "acknowledgedDate:string", "status:string")},
    @{folder="document-management"; file="document-templates.tsx"; interface="DocumentTemplate"; title="Document Templates"; api="/hrm/document-templates"; fields=@("name:string", "content:string", "categoryId:number", "isActive:boolean")},
    
    # Meetings
    @{folder="meetings"; file="meeting-types.tsx"; interface="MeetingType"; title="Meeting Types"; api="/hrm/meeting-types"; fields=@("name:string", "code:string", "description:string", "isActive:boolean")},
    @{folder="meetings"; file="meeting-rooms.tsx"; interface="MeetingRoom"; title="Meeting Rooms"; api="/hrm/meeting-rooms"; fields=@("name:string", "location:string", "capacity:number", "isActive:boolean")},
    @{folder="meetings"; file="meetings.tsx"; interface="Meeting"; title="Meetings"; api="/hrm/meetings"; fields=@("title:string", "meetingTypeId:number", "roomId:number", "startTime:string", "endTime:string", "status:string")},
    @{folder="meetings"; file="meeting-attendees.tsx"; interface="MeetingAttendee"; title="Meeting Attendees"; api="/hrm/meeting-attendees"; fields=@("meetingId:number", "employeeId:number", "status:string")},
    @{folder="meetings"; file="meeting-minutes.tsx"; interface="MeetingMinute"; title="Meeting Minutes"; api="/hrm/meeting-minutes"; fields=@("meetingId:number", "content:string", "createdBy:number", "createdDate:string")},
    @{folder="meetings"; file="action-items.tsx"; interface="ActionItem"; title="Action Items"; api="/hrm/action-items"; fields=@("meetingId:number", "description:string", "assignedTo:number", "dueDate:string", "status:string")},
    
    # Calendar
    @{folder="calendar"; file="calendar-events.tsx"; interface="CalendarEvent"; title="Calendar Events"; api="/hrm/calendar-events"; fields=@("title:string", "description:string", "startDate:string", "endDate:string", "eventType:string", "isActive:boolean")},
    
    # Media Library
    @{folder="media-library"; file="media-files.tsx"; interface="MediaFile"; title="Media Files"; api="/hrm/media-files"; fields=@("fileName:string", "filePath:string", "fileType:string", "uploadedBy:number", "uploadedDate:string")}
)

$template = @'
import { useState, useEffect } from 'react';
import AdminLayout from '../../../../layouts/AdminLayout';
import api from '../../../../services/api';

interface {INTERFACE} {
  id: number;
{INTERFACE_FIELDS}
}

export default function {COMPONENT_NAME}Page() {
  const [{VAR_NAME}s, set{COMPONENT_NAME}s] = useState<{INTERFACE}[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing{INTERFACE}, setEditing{INTERFACE}] = useState<{INTERFACE} | null>(null);
  const [formData, setFormData] = useState({
{FORM_DATA}
  });

  useEffect(() => {
    fetch{COMPONENT_NAME}s();
  }, []);

  const fetch{COMPONENT_NAME}s = async () => {
    try {
      const response = await api.get('{API_ENDPOINT}');
      set{COMPONENT_NAME}s(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to fetch {LOWER_TITLE}:', error);
      set{COMPONENT_NAME}s([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing{INTERFACE}) {
        await api.put(`{API_ENDPOINT}/$~editing{INTERFACE}.id~`, formData);
      } else {
        await api.post('{API_ENDPOINT}', formData);
      }
      fetch{COMPONENT_NAME}s();
      resetForm();
    } catch (error) {
      console.error('Failed to save {LOWER_TITLE}:', error);
    }
  };

  const handleEdit = ({VAR_NAME}: {INTERFACE}) => {
    setEditing{INTERFACE}({VAR_NAME});
    setFormData({
{EDIT_MAPPING}
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this {LOWER_TITLE}?')) {
      try {
        await api.delete(`{API_ENDPOINT}/$~id~`);
        fetch{COMPONENT_NAME}s();
      } catch (error) {
        console.error('Failed to delete {LOWER_TITLE}:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
{RESET_FORM}
    });
    setEditing{INTERFACE}(null);
    setShowModal(false);
  };

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">{TITLE}</h1>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Add New {SINGULAR_TITLE}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : {VAR_NAME}s.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-500">No {LOWER_TITLE} found. Click "Add New {SINGULAR_TITLE}" to create one.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
{TABLE_HEADERS}
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {{VAR_NAME}s.map(({VAR_NAME}) => (
                  <tr key={{VAR_NAME}.id}>
{TABLE_CELLS}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit({VAR_NAME})}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete({VAR_NAME}.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-4">
                {editing{INTERFACE} ? 'Edit {SINGULAR_TITLE}' : 'Add New {SINGULAR_TITLE}'}
              </h2>
              <form onSubmit={handleSubmit}>
{FORM_FIELDS}
                <div className="flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    {editing{INTERFACE} ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
'@

function Get-TitleCase {
    param($str)
    return (Get-Culture).TextInfo.ToTitleCase($str.ToLower())
}

function Get-CamelCase {
    param($str)
    $str = $str -replace '-', ' '
    $words = $str.Split(' ')
    $first = $words[0].ToLower()
    $rest = $words[1..($words.Length-1)] | ForEach-Object { (Get-Culture).TextInfo.ToTitleCase($_.ToLower()) }
    return $first + ($rest -join '')
}

foreach ($def in $pageDefinitions) {
    $folder = $def.folder
    $file = $def.file
    $interface = $def.interface
    $title = $def.title
    $api = $def.api
    $fields = $def.fields
    
    # Create directory if not exists
    $dirPath = "frontend\src\pages\admin\hrm\$folder"
    if (!(Test-Path $dirPath)) {
        New-Item -Path $dirPath -ItemType Directory -Force | Out-Null
    }
    
    # Generate various names
    $componentName = $interface
    $varName = $interface.Substring(0,1).ToLower() + $interface.Substring(1)
    $lowerTitle = $title.ToLower()
    $singularTitle = $title -replace 's$', ''
    if ($singularTitle -eq $title) {
        $singularTitle = $title.Trim()
    }
    
    # Generate interface fields
    $interfaceFields = ""
    $formDataFields = ""
    $editMapping = ""
    $resetForm = ""
    $tableHeaders = ""
    $tableCells = ""
    $formFields = ""
    
    foreach ($field in $fields) {
        $parts = $field.Split(':')
        $fieldName = $parts[0]
        $fieldType = $parts[1]
        
        $interfaceFields += "  $fieldName"
        if ($fieldType -eq "boolean") {
            $interfaceFields += ": boolean;`n"
        } elseif ($fieldType -eq "number") {
            $interfaceFields += ": number;`n"
        } else {
            $interfaceFields += "?: string;`n"
        }
        
        # Form data
        if ($fieldType -eq "boolean") {
            $formDataFields += "    $fieldName`: true,`n"
            $resetForm += "      $fieldName`: true,`n"
        } elseif ($fieldType -eq "number") {
            $formDataFields += "    $fieldName`: '',`n"
            $resetForm += "      $fieldName`: '',`n"
        } else {
            $formDataFields += "    $fieldName`: '',`n"
            $resetForm += "      $fieldName`: '',`n"
        }
        
        # Edit mapping
        if ($fieldType -eq "boolean") {
            $editMapping += "      $fieldName`: $varName.$fieldName,`n"
        } elseif ($fieldType -eq "number") {
            $editMapping += "      $fieldName`: $varName.$fieldName.toString(),`n"
        } else {
            $editMapping += "      $fieldName`: $varName.$fieldName || '',`n"
        }
        
        # Table headers
        $headerName = (Get-Culture).TextInfo.ToTitleCase($fieldName -replace '([A-Z])', ' $1').Trim()
        $tableHeaders += "                  <th className=`"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase`">$headerName</th>`n"
        
        # Table cells
        if ($fieldType -eq "boolean") {
            $tableCells += "                    <td className=`"px-6 py-4 whitespace-nowrap`">`n"
            $tableCells += "                      <span className={``px-2 inline-flex text-xs leading-5 font-semibold rounded-full `${$varName.$fieldName ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}``}>`n"
            $tableCells += "                        {$varName.$fieldName ? 'Yes' : 'No'}`n"
            $tableCells += "                      </span>`n"
            $tableCells += "                    </td>`n"
        } elseif ($fieldName -match "Date") {
            $tableCells += "                    <td className=`"px-6 py-4 whitespace-nowrap text-sm text-gray-500`">`n"
            $tableCells += "                      {$varName.$fieldName ? new Date($varName.$fieldName).toLocaleDateString() : '-'}`n"
            $tableCells += "                    </td>`n"
        } else {
            $tableCells += "                    <td className=`"px-6 py-4 whitespace-nowrap text-sm text-gray-900`">{$varName.$fieldName}</td>`n"
        }
        
        # Form fields
        $labelName = (Get-Culture).TextInfo.ToTitleCase($fieldName -replace '([A-Z])', ' $1').Trim()
        if ($fieldType -eq "boolean") {
            $formFields += "                <div className=`"mb-4`">`n"
            $formFields += "                  <label className=`"flex items-center`">`n"
            $formFields += "                    <input`n"
            $formFields += "                      type=`"checkbox`"`n"
            $formFields += "                      checked={formData.$fieldName}`n"
            $formFields += "                      onChange={(e) => setFormData({ ...formData, $fieldName`: e.target.checked })}`n"
            $formFields += "                      className=`"mr-2`"`n"
            $formFields += "                    />`n"
            $formFields += "                    <span className=`"text-sm font-medium text-gray-700`">$labelName</span>`n"
            $formFields += "                  </label>`n"
            $formFields += "                </div>`n"
        } elseif ($fieldName -match "Date") {
            $formFields += "                <div className=`"mb-4`">`n"
            $formFields += "                  <label className=`"block text-sm font-medium text-gray-700 mb-2`">$labelName</label>`n"
            $formFields += "                  <input`n"
            $formFields += "                    type=`"date`"`n"
            $formFields += "                    value={formData.$fieldName}`n"
            $formFields += "                    onChange={(e) => setFormData({ ...formData, $fieldName`: e.target.value })}`n"
            $formFields += "                    className=`"w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`"`n"
            $formFields += "                    required`n"
            $formFields += "                  />`n"
            $formFields += "                </div>`n"
        } elseif ($fieldType -eq "number") {
            $formFields += "                <div className=`"mb-4`">`n"
            $formFields += "                  <label className=`"block text-sm font-medium text-gray-700 mb-2`">$labelName</label>`n"
            $formFields += "                  <input`n"
            $formFields += "                    type=`"number`"`n"
            if ($fieldName -match "salary|amount|price") {
                $formFields += "                    step=`"0.01`"`n"
            }
            $formFields += "                    value={formData.$fieldName}`n"
            $formFields += "                    onChange={(e) => setFormData({ ...formData, $fieldName`: e.target.value })}`n"
            $formFields += "                    className=`"w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`"`n"
            $formFields += "                    required`n"
            $formFields += "                  />`n"
            $formFields += "                </div>`n"
        } elseif ($fieldName -match "description|body|content|comments|feedback|reason") {
            $formFields += "                <div className=`"mb-4`">`n"
            $formFields += "                  <label className=`"block text-sm font-medium text-gray-700 mb-2`">$labelName</label>`n"
            $formFields += "                  <textarea`n"
            $formFields += "                    value={formData.$fieldName}`n"
            $formFields += "                    onChange={(e) => setFormData({ ...formData, $fieldName`: e.target.value })}`n"
            $formFields += "                    className=`"w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`"`n"
            $formFields += "                    rows={3}`n"
            $formFields += "                  />`n"
            $formFields += "                </div>`n"
        } else {
            $formFields += "                <div className=`"mb-4`">`n"
            $formFields += "                  <label className=`"block text-sm font-medium text-gray-700 mb-2`">$labelName</label>`n"
            $formFields += "                  <input`n"
            $formFields += "                    type=`"text`"`n"
            $formFields += "                    value={formData.$fieldName}`n"
            $formFields += "                    onChange={(e) => setFormData({ ...formData, $fieldName`: e.target.value })}`n"
            $formFields += "                    className=`"w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`"`n"
            $formFields += "                    required`n"
            $formFields += "                  />`n"
            $formFields += "                </div>`n"
        }
    }
    
    # Replace placeholders
    $content = $template
    $content = $content -replace '\{INTERFACE\}', $interface
    $content = $content -replace '\{COMPONENT_NAME\}', $componentName
    $content = $content -replace '\{VAR_NAME\}', $varName
    $content = $content -replace '\{TITLE\}', $title
    $content = $content -replace '\{SINGULAR_TITLE\}', $singularTitle
    $content = $content -replace '\{LOWER_TITLE\}', $lowerTitle
    $content = $content -replace '\{API_ENDPOINT\}', $api
    $content = $content -replace '\{INTERFACE_FIELDS\}', $interfaceFields.TrimEnd()
    $content = $content -replace '\{FORM_DATA\}', $formDataFields.TrimEnd()
    $content = $content -replace '\{EDIT_MAPPING\}', $editMapping.TrimEnd()
    $content = $content -replace '\{RESET_FORM\}', $resetForm.TrimEnd()
    $content = $content -replace '\{TABLE_HEADERS\}', $tableHeaders.TrimEnd()
    $content = $content -replace '\{TABLE_CELLS\}', $tableCells.TrimEnd()
    $content = $content -replace '\{FORM_FIELDS\}', $formFields.TrimEnd()
    $content = $content -replace '\$~', '{'
    $content = $content -replace '~', '}'
    
    # Write file
    $filePath = "$dirPath\$file"
    Set-Content -Path $filePath -Value $content -Encoding UTF8
    
    Write-Output "Created $filePath"
}

Write-Output "`nAll $($pageDefinitions.Count) pages created successfully!"
