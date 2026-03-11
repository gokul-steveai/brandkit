import { ExternalLink, Briefcase, MapPin, Calendar, Users, Award } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { isLinkedInImageUrl } from '../types';
import type { SocialProfile, Experience, Recommendation, Skill } from '../types';

interface LinkedInFieldsProps {
  formData: Partial<SocialProfile>;
  onChange: (data: Partial<SocialProfile>) => void;
}

export function LinkedInFields({ formData, onChange }: LinkedInFieldsProps) {
  const experiences = (formData.experiences as unknown as Experience[]) || [];
  const skills = (formData.skills as unknown as Skill[]) || [];
  const recommendations = (formData.recommendations as unknown as Recommendation[]) || [];
  const recommendationsGiven = (formData.recommendations_given as unknown as Recommendation[]) || [];

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'Present';
    return dateStr;
  };

  return (
    <div className="space-y-6">
      {/* Header Fields */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            value={formData.first_name || ''}
            onChange={(e) => onChange({ ...formData, first_name: e.target.value })}
            className="border-2"
          />
        </div>
        <div>
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            value={formData.last_name || ''}
            onChange={(e) => onChange({ ...formData, last_name: e.target.value })}
            className="border-2"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="headline">Headline</Label>
        <Input
          id="headline"
          value={formData.headline || ''}
          onChange={(e) => onChange({ ...formData, headline: e.target.value })}
          className="border-2"
        />
      </div>

      {/* Stats Row */}
      <div className="flex items-center gap-6 text-sm text-muted-foreground">
        {formData.connections && (
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{formData.connections.toLocaleString()} connections</span>
          </div>
        )}
        {formData.followers && (
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{formData.followers.toLocaleString()} followers</span>
          </div>
        )}
        {formData.is_influencer && (
          <Badge variant="secondary">Influencer</Badge>
        )}
      </div>

      <Separator />

      {/* Current Role */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          Current Role
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="jobTitle">Job Title</Label>
            <Input
              id="jobTitle"
              value={formData.job_title || ''}
              onChange={(e) => onChange({ ...formData, job_title: e.target.value })}
              className="border-2"
            />
          </div>
          <div>
            <Label htmlFor="companyName">Company</Label>
            <Input
              id="companyName"
              value={formData.company_name || ''}
              onChange={(e) => onChange({ ...formData, company_name: e.target.value })}
              className="border-2"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="companyWebsite">Company Website</Label>
          <Input
            id="companyWebsite"
            value={formData.company_website || ''}
            onChange={(e) => onChange({ ...formData, company_website: e.target.value })}
            className="border-2"
          />
        </div>
      </div>

      <Separator />

      {/* About Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">About</h3>
        <Textarea
          value={formData.about || ''}
          onChange={(e) => onChange({ ...formData, about: e.target.value })}
          className="border-2 min-h-[150px]"
        />
      </div>

      {/* Skills Section */}
      {skills.length > 0 && (
        <>
          <Separator />
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Award className="h-5 w-5" />
              Skills
            </h3>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill, index) => (
                <Badge key={index} variant="outline" className="border-2">
                  {skill.title}
                </Badge>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Experience Section */}
      {experiences.length > 0 && (
        <>
          <Separator />
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Experience
            </h3>
            <div className="space-y-6">
              {experiences.map((exp, index) => (
                <div key={index} className="flex gap-4">
                  {exp.logo && isLinkedInImageUrl(exp.logo) ? (
                    <Avatar className="h-12 w-12 border">
                      <AvatarImage src={exp.logo} />
                      <AvatarFallback>{exp.companyName?.[0] || '?'}</AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                      <Briefcase className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h4 className="font-semibold">{exp.title}</h4>
                    <p className="text-sm text-muted-foreground">{exp.companyName}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(exp.jobStartedOn)} - {formatDate(exp.jobEndedOn)}
                      </span>
                      {exp.jobLocation && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {exp.jobLocation}
                        </span>
                      )}
                    </div>
                    {exp.jobDescription && (
                      <p className="text-sm mt-2 text-muted-foreground line-clamp-3">
                        {exp.jobDescription}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Recommendations Received */}
      {recommendations.length > 0 && (
        <>
          <Separator />
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Recommendations Received</h3>
            <div className="space-y-4">
              {recommendations.slice(0, 3).map((rec, index) => (
                <div key={index} className="p-4 bg-muted/50 rounded-lg border-2 border-border">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{rec.name}</p>
                      <p className="text-xs text-muted-foreground">{rec.subtitle}</p>
                      <p className="text-xs text-muted-foreground mt-1">{rec.date}</p>
                    </div>
                    {rec.url && (
                      <a
                        href={rec.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                  {rec.description && (
                    <p className="text-sm mt-3 text-muted-foreground line-clamp-4">
                      {rec.description}
                    </p>
                  )}
                </div>
              ))}
              {recommendations.length > 3 && (
                <p className="text-sm text-muted-foreground">
                  + {recommendations.length - 3} more recommendations
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {/* Recommendations Given */}
      {recommendationsGiven.length > 0 && (
        <>
          <Separator />
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Recommendations Given</h3>
            <div className="space-y-4">
              {recommendationsGiven.slice(0, 2).map((rec, index) => (
                <div key={index} className="p-4 bg-muted/50 rounded-lg border-2 border-border">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{rec.name}</p>
                      <p className="text-xs text-muted-foreground">{rec.subtitle}</p>
                    </div>
                  </div>
                  {rec.description && (
                    <p className="text-sm mt-3 text-muted-foreground line-clamp-3">
                      {rec.description}
                    </p>
                  )}
                </div>
              ))}
              {recommendationsGiven.length > 2 && (
                <p className="text-sm text-muted-foreground">
                  + {recommendationsGiven.length - 2} more recommendations
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
